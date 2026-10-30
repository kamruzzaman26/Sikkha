create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  idempotency_key uuid not null,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_phone text not null check (char_length(customer_phone) between 7 and 25),
  delivery_address text not null check (char_length(delivery_address) between 10 and 1000),
  currency text not null default 'BDT' check (currency = 'BDT'),
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  payment_method_id uuid not null
    references public.payment_methods (id) on delete restrict,
  payment_method_name text not null,
  payment_method_type text not null
    check (payment_method_type in ('manual', 'cod')),
  payment_instructions text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'awaiting'
    check (payment_status in ('awaiting', 'submitted', 'verified', 'rejected')),
  payment_reviewed_at timestamptz,
  payment_reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (payment_method_type <> 'manual' or payment_status <> 'verified' or payment_reviewed_at is not null),
  check (payment_method_type <> 'cod' or payment_status <> 'submitted')
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_title text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total numeric(14, 2) not null check (line_total = unit_price * quantity),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create table if not exists public.order_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_method_id uuid not null
    references public.payment_methods (id) on delete restrict,
  transaction_reference text not null
    check (char_length(transaction_reference) between 3 and 100),
  status text not null default 'submitted'
    check (status in ('submitted', 'verified', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  check (status <> 'verified' or reviewed_at is not null),
  check (status <> 'rejected' or reviewed_at is not null)
);

create unique index if not exists order_payment_submissions_reference_unique_idx
  on public.order_payment_submissions (payment_method_id, lower(transaction_reference));
create unique index if not exists order_payment_submissions_one_pending_idx
  on public.order_payment_submissions (order_id)
  where status = 'submitted';
create index if not exists orders_customer_created_idx
  on public.orders (user_id, created_at desc);
create index if not exists orders_admin_created_idx
  on public.orders (status, created_at desc);
create index if not exists orders_created_idx
  on public.orders (created_at desc);
create index if not exists order_items_order_idx
  on public.order_items (order_id);
create index if not exists order_payment_submissions_order_submitted_idx
  on public.order_payment_submissions (order_id, submitted_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_payment_submissions enable row level security;

revoke all on public.orders from public, anon, authenticated;
revoke all on public.order_items from public, anon, authenticated;
revoke all on public.order_payment_submissions from public, anon, authenticated;

grant select (
  id,
  user_id,
  customer_name,
  customer_phone,
  delivery_address,
  currency,
  total_amount,
  payment_method_id,
  payment_method_name,
  payment_method_type,
  payment_instructions,
  status,
  payment_status,
  payment_reviewed_at,
  created_at,
  updated_at
) on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select (
  id,
  order_id,
  transaction_reference,
  status,
  submitted_at,
  reviewed_at,
  rejection_reason
) on public.order_payment_submissions to authenticated;

drop policy if exists "Customers and admins can read orders"
  on public.orders;
create policy "Customers and admins can read orders"
  on public.orders
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role = 'admin'
    )
  );

drop policy if exists "Customers and admins can read order items"
  on public.order_items;
create policy "Customers and admins can read order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where id = order_items.order_id
        and (
          user_id = (select auth.uid())
          or exists (
            select 1
            from public.admin_users
            where user_id = (select auth.uid())
              and role = 'admin'
          )
        )
    )
  );

drop policy if exists "Customers and admins can read payment submissions"
  on public.order_payment_submissions;
create policy "Customers and admins can read payment submissions"
  on public.order_payment_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where id = order_payment_submissions.order_id
        and (
          user_id = (select auth.uid())
          or exists (
            select 1
            from public.admin_users
            where user_id = (select auth.uid())
              and role = 'admin'
          )
        )
    )
  );

create or replace function public.place_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_payment_method_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  existing_order_id uuid;
  created_order_id uuid;
  selected_payment_method record;
  requested_item jsonb;
  requested_product_id uuid;
  requested_quantity integer;
  selected_product record;
  seen_product_ids uuid[] := array[]::uuid[];
  computed_total numeric(20, 2) := 0;
  item_count integer;
begin
  if requesting_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_idempotency_key is null
    or p_customer_name is null
    or p_customer_phone is null
    or p_delivery_address is null
    or p_payment_method_id is null
    or char_length(btrim(p_customer_name)) not between 2 and 100
    or char_length(btrim(p_customer_phone)) not between 7 and 25
    or char_length(btrim(p_delivery_address)) not between 10 and 1000
    or btrim(p_customer_phone) !~ '^[+0-9][0-9+ ()-]{6,24}$'
    or length(regexp_replace(p_customer_phone, '[^0-9]', '', 'g')) < 7
    or p_items is null
    or jsonb_typeof(p_items) <> 'array'
  then
    raise exception 'Invalid order details.' using errcode = '23514';
  end if;

  select count(*) into item_count from jsonb_array_elements(p_items);
  if item_count < 1 or item_count > 20 then
    raise exception 'Order must contain between 1 and 20 products.'
      using errcode = '23514';
  end if;

  select id into existing_order_id
  from public.orders
  where user_id = requesting_user
    and idempotency_key = p_idempotency_key;
  if existing_order_id is not null then
    return existing_order_id;
  end if;

  select id, name, method_type, instructions
  into selected_payment_method
  from public.payment_methods
  where id = p_payment_method_id
    and is_enabled
    and method_type in ('manual', 'cod')
  for share;
  if not found then
    raise exception 'Selected payment method is unavailable.'
      using errcode = '23514';
  end if;

  for requested_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(requested_item) <> 'object'
      or requested_item->>'product_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or requested_item->>'quantity' !~ '^[0-9]{1,2}$'
    then
      raise exception 'Invalid product selection.' using errcode = '23514';
    end if;

    requested_product_id := (requested_item->>'product_id')::uuid;
    requested_quantity := (requested_item->>'quantity')::integer;
    if requested_product_id = any(seen_product_ids) then
      raise exception 'Duplicate product selection.' using errcode = '23514';
    end if;
    seen_product_ids := array_append(seen_product_ids, requested_product_id);
    if requested_quantity not between 1 and 99 then
      raise exception 'Product quantity is out of range.'
        using errcode = '23514';
    end if;

    select id, title, price
    into selected_product
    from public.products
    where id = requested_product_id
      and is_published
      and price >= 0
    for share;
    if not found then
      raise exception 'A selected product is unavailable.'
        using errcode = '23514';
    end if;

    computed_total := computed_total + selected_product.price * requested_quantity;
    if computed_total > 999999999999.99 then
      raise exception 'Order total is out of range.' using errcode = '23514';
    end if;
  end loop;

  insert into public.orders (
    user_id,
    idempotency_key,
    customer_name,
    customer_phone,
    delivery_address,
    currency,
    total_amount,
    payment_method_id,
    payment_method_name,
    payment_method_type,
    payment_instructions
  )
  values (
    requesting_user,
    p_idempotency_key,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    btrim(p_delivery_address),
    'BDT',
    computed_total,
    selected_payment_method.id,
    selected_payment_method.name,
    selected_payment_method.method_type,
    selected_payment_method.instructions
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into created_order_id;

  if created_order_id is null then
    select id into created_order_id
    from public.orders
    where user_id = requesting_user
      and idempotency_key = p_idempotency_key;
    return created_order_id;
  end if;

  for requested_item in select value from jsonb_array_elements(p_items)
  loop
    requested_product_id := (requested_item->>'product_id')::uuid;
    requested_quantity := (requested_item->>'quantity')::integer;

    insert into public.order_items (
      order_id,
      product_id,
      product_title,
      unit_price,
      quantity,
      line_total
    )
    select
      created_order_id,
      id,
      title,
      price,
      requested_quantity,
      price * requested_quantity
    from public.products
    where id = requested_product_id;
  end loop;

  return created_order_id;
end;
$$;

create or replace function public.submit_manual_payment(
  p_order_id uuid,
  p_transaction_reference text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  selected_order record;
  existing_submission_id uuid;
  created_submission_id uuid;
begin
  if requesting_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_transaction_reference is null
    or char_length(btrim(p_transaction_reference)) not between 3 and 100
    or btrim(p_transaction_reference) !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{1,99}$'
  then
    raise exception 'Invalid transaction reference.' using errcode = '23514';
  end if;

  select id, user_id, payment_method_id, payment_method_type,
         payment_status, status
  into selected_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or selected_order.user_id <> requesting_user then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if selected_order.payment_method_type <> 'manual'
    or selected_order.status in ('cancelled', 'delivered')
  then
    raise exception 'Manual payment cannot be submitted for this order.'
      using errcode = '23514';
  end if;

  if selected_order.payment_status = 'submitted' then
    select id into existing_submission_id
    from public.order_payment_submissions
    where order_id = p_order_id
      and status = 'submitted';
    if exists (
      select 1
      from public.order_payment_submissions
      where id = existing_submission_id
        and transaction_reference = btrim(p_transaction_reference)
    ) then
      return existing_submission_id;
    end if;
    raise exception 'A payment reference is already awaiting review.'
      using errcode = '23514';
  end if;
  if selected_order.payment_status = 'verified' then
    raise exception 'Payment is already verified.' using errcode = '23514';
  end if;

  insert into public.order_payment_submissions (
    order_id,
    payment_method_id,
    transaction_reference
  )
  values (
    p_order_id,
    selected_order.payment_method_id,
    btrim(p_transaction_reference)
  )
  returning id into created_submission_id;

  update public.orders
  set payment_status = 'submitted',
      updated_at = now()
  where id = p_order_id;

  return created_submission_id;
end;
$$;

create or replace function public.review_order_payment(
  p_order_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  selected_order record;
  selected_submission record;
begin
  if requesting_user is null or not exists (
    select 1
    from public.admin_users
    where user_id = requesting_user
      and role = 'admin'
  ) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_decision is null
    or p_decision not in ('verified', 'rejected')
    or (p_rejection_reason is not null and char_length(p_rejection_reason) > 500)
  then
    raise exception 'Invalid payment review.' using errcode = '23514';
  end if;

  select id, payment_method_type, payment_status, payment_method_id, status
  into selected_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if selected_order.payment_status = 'verified' then
    if p_decision = 'verified' then
      return p_order_id;
    end if;
    raise exception 'Verified payment cannot be rejected.'
      using errcode = '23514';
  end if;

  if selected_order.payment_method_type = 'cod' then
    if p_decision <> 'verified' or selected_order.status <> 'delivered'
      or selected_order.payment_status <> 'awaiting'
    then
      raise exception 'Confirm COD payment only after delivery and cash collection.'
        using errcode = '23514';
    end if;
  else
    if selected_order.status = 'cancelled' then
      raise exception 'Cancelled orders cannot have manual payments verified.'
        using errcode = '23514';
    end if;
    select id, status into selected_submission
    from public.order_payment_submissions
    where order_id = p_order_id
      and status = 'submitted'
    for update;
    if not found or selected_order.payment_status <> 'submitted' then
      raise exception 'No submitted manual payment is awaiting review.'
        using errcode = '23514';
    end if;
    if p_decision = 'rejected' and btrim(coalesce(p_rejection_reason, '')) = '' then
      raise exception 'A reason is required to reject a payment.'
        using errcode = '23514';
    end if;

    update public.order_payment_submissions
    set status = p_decision,
        reviewed_at = now(),
        reviewed_by = requesting_user,
        rejection_reason = case
          when p_decision = 'rejected' then btrim(p_rejection_reason)
          else null
        end
    where id = selected_submission.id;
  end if;

  update public.orders
  set payment_status = p_decision,
      payment_reviewed_at = now(),
      payment_reviewed_by = requesting_user,
      status = case
        when p_decision = 'verified' and payment_method_type = 'manual'
          and status = 'pending' then 'confirmed'
        else status
      end,
      updated_at = now()
  where id = p_order_id;

  return p_order_id;
end;
$$;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_next_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  selected_order record;
  allowed_transition boolean := false;
begin
  if requesting_user is null or not exists (
    select 1
    from public.admin_users
    where user_id = requesting_user
      and role = 'admin'
  ) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_next_status is null
    or p_next_status not in ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
  then
    raise exception 'Invalid order status.' using errcode = '23514';
  end if;

  select id, status, payment_status, payment_method_type
  into selected_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if selected_order.status = p_next_status then
    return p_order_id;
  end if;

  allowed_transition := case selected_order.status
    when 'pending' then p_next_status in ('confirmed', 'cancelled')
    when 'confirmed' then p_next_status in ('processing', 'cancelled')
    when 'processing' then p_next_status in ('shipped', 'cancelled')
    when 'shipped' then p_next_status = 'delivered'
    else false
  end;
  if not allowed_transition then
    raise exception 'Invalid order status transition.' using errcode = '23514';
  end if;
  if p_next_status = 'cancelled' and selected_order.payment_status = 'verified' then
    raise exception 'Verified orders require a separate refund process before cancellation.'
      using errcode = '23514';
  end if;
  if p_next_status = 'cancelled' and selected_order.payment_status = 'submitted' then
    raise exception 'Review the submitted payment reference before cancelling.'
      using errcode = '23514';
  end if;
  if selected_order.payment_method_type = 'manual'
    and p_next_status in ('confirmed', 'processing', 'shipped', 'delivered')
    and selected_order.payment_status <> 'verified'
  then
    raise exception 'Verify manual payment before confirming or shipping.'
      using errcode = '23514';
  end if;

  update public.orders
  set status = p_next_status,
      updated_at = now()
  where id = p_order_id;
  return p_order_id;
end;
$$;

revoke all on function public.place_order(uuid, text, text, text, uuid, jsonb)
  from public, anon;
revoke all on function public.submit_manual_payment(uuid, text)
  from public, anon;
revoke all on function public.review_order_payment(uuid, text, text)
  from public, anon;
revoke all on function public.admin_update_order_status(uuid, text)
  from public, anon;
grant execute on function public.place_order(uuid, text, text, text, uuid, jsonb)
  to authenticated;
grant execute on function public.submit_manual_payment(uuid, text)
  to authenticated;
grant execute on function public.review_order_payment(uuid, text, text)
  to authenticated;
grant execute on function public.admin_update_order_status(uuid, text)
  to authenticated;
