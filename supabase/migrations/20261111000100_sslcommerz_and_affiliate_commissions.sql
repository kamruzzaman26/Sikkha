-- SSLCOMMERZ hosted checkout + per-product affiliate referral commissions.
-- Provider secrets are never stored in database rows.

alter table public.products
  add column if not exists affiliate_commission_type text not null default 'none',
  add column if not exists affiliate_commission_value numeric(12,2) not null default 0;

alter table public.products
  drop constraint if exists products_affiliate_commission_type_check,
  drop constraint if exists products_affiliate_commission_value_check;
alter table public.products
  add constraint products_affiliate_commission_type_check
    check (affiliate_commission_type in ('none','percentage','fixed')),
  add constraint products_affiliate_commission_value_check
    check (
      affiliate_commission_value >= 0
      and (affiliate_commission_type <> 'percentage' or affiliate_commission_value <= 100)
      and (
        (affiliate_commission_type = 'none' and affiliate_commission_value = 0)
        or (affiliate_commission_type in ('percentage','fixed') and affiliate_commission_value > 0)
      )
    );

alter table public.order_items
  add column if not exists affiliate_commission_type text not null default 'none',
  add column if not exists affiliate_commission_value numeric(12,2) not null default 0,
  add column if not exists affiliate_commission_eligible boolean not null default false;

alter table public.order_items
  drop constraint if exists order_items_affiliate_commission_type_check,
  drop constraint if exists order_items_affiliate_commission_value_check;
alter table public.order_items
  add constraint order_items_affiliate_commission_type_check
    check (affiliate_commission_type in ('none','percentage','fixed')),
  add constraint order_items_affiliate_commission_value_check
    check (affiliate_commission_value >= 0);

alter table public.orders
  drop constraint if exists orders_payment_method_type_check;
alter table public.orders
  add constraint orders_payment_method_type_check
    check (payment_method_type in ('manual','cod','gateway'));

alter table public.payment_methods
  drop constraint if exists payment_methods_check;
alter table public.payment_methods
  add constraint payment_methods_check
    check (method_type <> 'gateway' or code = 'sslcommerz');

drop policy if exists "Public can read enabled payment methods"
  on public.payment_methods;
create policy "Public can read enabled payment methods"
  on public.payment_methods
  for select
  to anon, authenticated
  using (
    is_enabled
    and (
      method_type <> 'gateway'
      or code = 'sslcommerz'
    )
  );

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider_code text not null check (provider_code = 'sslcommerz'),
  merchant_reference text not null unique check (char_length(merchant_reference) between 8 and 30),
  provider_session_id text,
  provider_transaction_id text,
  validation_id text,
  gateway_page_url text,
  amount numeric(12,2) not null check (amount between 10 and 500000),
  currency text not null default 'BDT' check (currency = 'BDT'),
  status text not null default 'initiated'
    check (status in ('initiated','pending','paid','failed','cancelled','refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_transactions_one_active_order_idx
  on public.payment_transactions(order_id)
  where status in ('initiated','pending','paid');
create unique index if not exists payment_transactions_provider_transaction_idx
  on public.payment_transactions(provider_code, provider_transaction_id)
  where provider_transaction_id is not null;
create index if not exists payment_transactions_order_created_idx
  on public.payment_transactions(order_id, created_at desc);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null check (provider_code = 'sslcommerz'),
  event_key text not null,
  payload_hash text not null check (char_length(payload_hash) between 32 and 128),
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  safe_error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider_code, event_key)
);

alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_transactions from public, anon, authenticated;
revoke all on public.payment_webhook_events from public, anon, authenticated;
grant all on public.payment_transactions to service_role;
grant all on public.payment_webhook_events to service_role;

create table if not exists public.affiliate_product_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  affiliate_user_id uuid not null references auth.users(id) on delete restrict,
  commission_type text not null check (commission_type in ('percentage','fixed')),
  commission_value numeric(12,2) not null check (commission_value > 0),
  commission_base_amount numeric(14,2) not null check (commission_base_amount >= 0),
  commission_amount numeric(14,2) not null check (commission_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending','approved','paid','reversed')),
  reversal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_item_id, affiliate_user_id)
);

create index if not exists affiliate_product_commissions_user_created_idx
  on public.affiliate_product_commissions(affiliate_user_id, created_at desc);
create index if not exists affiliate_product_commissions_status_created_idx
  on public.affiliate_product_commissions(status, created_at desc);

alter table public.affiliate_product_commissions enable row level security;
revoke all on public.affiliate_product_commissions from public, anon, authenticated;
grant select on public.affiliate_product_commissions to authenticated;
create policy "Admins can read affiliate product commissions"
  on public.affiliate_product_commissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
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

  select id, name, method_type, instructions, code
  into selected_payment_method
  from public.payment_methods
  where id = p_payment_method_id
    and is_enabled
    and (
      method_type in ('manual','cod')
      or (method_type = 'gateway' and code = 'sslcommerz')
    )
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

    select id, title, price, commerce_mode,
      affiliate_commission_type, affiliate_commission_value
    into selected_product
    from public.products
    where id = requested_product_id
      and is_published
      and archived_at is null
      and commerce_mode = 'direct'
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
    user_id, idempotency_key, customer_name, customer_phone, delivery_address,
    currency, total_amount, payment_method_id, payment_method_name,
    payment_method_type, payment_instructions
  )
  values (
    requesting_user, p_idempotency_key, btrim(p_customer_name),
    btrim(p_customer_phone), btrim(p_delivery_address), 'BDT', computed_total,
    selected_payment_method.id, selected_payment_method.name,
    selected_payment_method.method_type, selected_payment_method.instructions
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into created_order_id;

  if created_order_id is null then
    select id into created_order_id
    from public.orders
    where user_id = requesting_user and idempotency_key = p_idempotency_key;
    return created_order_id;
  end if;

  for requested_item in select value from jsonb_array_elements(p_items)
  loop
    requested_product_id := (requested_item->>'product_id')::uuid;
    requested_quantity := (requested_item->>'quantity')::integer;

    insert into public.order_items (
      order_id, product_id, product_title, unit_price, quantity, line_total,
      affiliate_commission_type, affiliate_commission_value, affiliate_commission_eligible
    )
    select
      created_order_id, id, title, price, requested_quantity, price * requested_quantity,
      affiliate_commission_type, affiliate_commission_value,
      commerce_mode = 'direct' and affiliate_commission_type <> 'none'
    from public.products
    where id = requested_product_id;
  end loop;

  return created_order_id;
end;
$$;

create or replace function public.create_sslcommerz_transaction(
  p_order_id uuid,
  p_merchant_reference text
)
returns table(
  transaction_id uuid,
  merchant_reference text,
  amount numeric,
  currency text,
  provider_session_id text,
  gateway_page_url text,
  transaction_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  selected_order record;
  existing_transaction record;
begin
  if requesting_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_order_id is null or p_merchant_reference is null
    or p_merchant_reference !~ '^[A-Za-z0-9_-]{8,30}$'
  then
    raise exception 'Invalid payment request.' using errcode = '23514';
  end if;

  select id, user_id, total_amount, currency, payment_method_type, payment_status, status
  into selected_order
  from public.orders
  where id = p_order_id and user_id = requesting_user
  for update;
  if not found or selected_order.payment_method_type <> 'gateway'
    or selected_order.payment_status not in ('awaiting','failed','cancelled')
    or selected_order.status = 'cancelled'
    or selected_order.currency <> 'BDT'
    or selected_order.total_amount not between 10 and 500000
  then
    raise exception 'Order is not eligible for online payment.' using errcode = '23514';
  end if;

  select id, merchant_reference, amount, currency, provider_session_id, gateway_page_url, status
  into existing_transaction
  from public.payment_transactions
  where order_id = p_order_id and status in ('initiated','pending')
  order by created_at desc limit 1;
  if found then
    return query select existing_transaction.id, existing_transaction.merchant_reference,
      existing_transaction.amount, existing_transaction.currency,
      existing_transaction.provider_session_id, existing_transaction.gateway_page_url,
      existing_transaction.status;
    return;
  end if;

  insert into public.payment_transactions(
    order_id, user_id, provider_code, merchant_reference, amount, currency
  ) values (
    p_order_id, requesting_user, 'sslcommerz', p_merchant_reference,
    selected_order.total_amount, 'BDT'
  )
  returning id, payment_transactions.merchant_reference,
    payment_transactions.amount, payment_transactions.currency,
    payment_transactions.provider_session_id, payment_transactions.gateway_page_url,
    payment_transactions.status
  into transaction_id, merchant_reference, amount, currency,
    provider_session_id, gateway_page_url, transaction_status;

  update public.orders
  set payment_status='awaiting', updated_at=now()
  where id=p_order_id and payment_status in ('failed','cancelled');

  return next;
end;
$$;

create or replace function public.update_sslcommerz_session(
  p_transaction_id uuid,
  p_provider_session_id text,
  p_gateway_page_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or p_transaction_id is null
    or p_provider_session_id is null or char_length(p_provider_session_id) > 100
    or p_gateway_page_url is null or p_gateway_page_url !~ '^https://'
    or char_length(p_gateway_page_url) > 2048
  then
    raise exception 'Invalid gateway session.' using errcode = '23514';
  end if;

  update public.payment_transactions
  set provider_session_id = p_provider_session_id,
      gateway_page_url = p_gateway_page_url,
      status = 'pending',
      updated_at = now()
  where id = p_transaction_id
    and user_id = requesting_user
    and status = 'initiated';
  if not found then
    raise exception 'Payment transaction not found.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.complete_sslcommerz_payment(
  p_merchant_reference text,
  p_validation_id text,
  p_provider_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_provider_status text,
  p_payload_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row record;
  event_key_value text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_merchant_reference is null
    or (p_provider_status in ('VALID','VALIDATED') and p_validation_id is null)
    or p_provider_transaction_id is null or p_amount is null
    or p_currency is null or p_provider_status is null
    or p_provider_status not in ('VALID','VALIDATED','FAILED','CANCELLED')
    or p_payload_hash is null
  then
    raise exception 'Invalid provider notification.' using errcode = '23514';
  end if;

  event_key_value := coalesce(p_provider_transaction_id,'') || ':' ||
    coalesce(p_validation_id,'') || ':' || p_provider_status;
  insert into public.payment_webhook_events(
    provider_code,event_key,payload_hash,processing_status
  ) values ('sslcommerz',event_key_value,p_payload_hash,'received')
  on conflict (provider_code,event_key) do nothing;
  if not found then
    return true;
  end if;

  select * into payment_row
  from public.payment_transactions
  where merchant_reference = p_merchant_reference
    and provider_code = 'sslcommerz'
  for update;
  if not found then
    update public.payment_webhook_events
    set processing_status='ignored', safe_error_code='transaction_not_found',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  if payment_row.amount <> p_amount or payment_row.currency <> p_currency then
    update public.payment_webhook_events
    set processing_status='failed', safe_error_code='amount_currency_mismatch',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  if exists (
    select 1 from public.orders
    where id = payment_row.order_id and status = 'cancelled'
  ) then
    update public.payment_webhook_events
    set processing_status='ignored', safe_error_code='order_cancelled',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  if payment_row.status = 'paid' then
    update public.payment_webhook_events
    set processing_status='processed', processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return true;
  end if;

  if p_provider_status in ('VALID','VALIDATED') then
    if payment_row.status in ('failed','cancelled','refunded') then
      update public.payment_webhook_events
      set processing_status='ignored', safe_error_code='invalid_late_success',
        processed_at=now()
      where provider_code='sslcommerz' and event_key=event_key_value;
      return false;
    end if;
    update public.payment_transactions
    set status='paid', validation_id=p_validation_id,
      provider_transaction_id=p_provider_transaction_id,
      verified_at=now(), updated_at=now()
    where id=payment_row.id;
    update public.orders
    set payment_status='verified', payment_reviewed_at=now(),
      status=case when status='pending' then 'confirmed' else status end,
      updated_at=now()
    where id=payment_row.order_id and payment_status='awaiting';
  elsif p_provider_status = 'FAILED' then
    update public.payment_transactions set status='failed', updated_at=now()
    where id=payment_row.id and status <> 'paid';
    update public.orders set payment_status='failed', updated_at=now()
    where id=payment_row.order_id and payment_status='awaiting';
  elsif p_provider_status = 'CANCELLED' then
    update public.payment_transactions set status='cancelled', updated_at=now()
    where id=payment_row.id and status <> 'paid';
    update public.orders set payment_status='cancelled', updated_at=now()
    where id=payment_row.order_id and payment_status='awaiting';
  end if;

  update public.payment_webhook_events
  set processing_status='processed', processed_at=now()
  where provider_code='sslcommerz' and event_key=event_key_value;
  return true;
end;
$$;

create or replace function public.sync_affiliate_product_commissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_status = 'verified'
    and old.payment_status is distinct from new.payment_status
  then
    insert into public.affiliate_product_commissions(
      order_id, order_item_id, product_id, affiliate_user_id,
      commission_type, commission_value, commission_base_amount, commission_amount
    )
    select
      new.id, item.id, item.product_id, referral.affiliate_user_id,
      item.affiliate_commission_type, item.affiliate_commission_value,
      basis.net_base,
      case
        when item.affiliate_commission_type = 'percentage'
          then round(basis.net_base * item.affiliate_commission_value / 100, 2)
        else least(basis.net_base, item.affiliate_commission_value * item.quantity)
      end
    from public.order_items item
    join public.affiliate_order_referrals referral
      on referral.order_id = new.id
    cross join lateral (
      select greatest(
        0,
        item.line_total - round(
          coalesce(new.discount_amount,0) * item.line_total /
          nullif((select sum(all_items.line_total) from public.order_items all_items where all_items.order_id=new.id),0),
          2
        )
      ) as net_base
    ) basis
    where item.order_id = new.id
      and item.affiliate_commission_eligible
      and item.affiliate_commission_type <> 'none'
    on conflict (order_item_id, affiliate_user_id) do nothing;
  elsif new.payment_status = 'refunded'
    and old.payment_status is distinct from new.payment_status
  then
    update public.affiliate_product_commissions
    set status='reversed',
      reversal_reason=coalesce(new.payment_refund_reason,'Order refunded'),
      updated_at=now()
    where order_id=new.id and status in ('pending','approved','paid');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_sync_affiliate_product_commissions on public.orders;
create trigger orders_sync_affiliate_product_commissions
after update of payment_status on public.orders
for each row execute function public.sync_affiliate_product_commissions();

revoke all on function public.sync_affiliate_product_commissions() from public, anon, authenticated;
revoke all on function public.create_sslcommerz_transaction(uuid,text) from public, anon;
revoke all on function public.update_sslcommerz_session(uuid,text,text) from public, anon;
revoke all on function public.complete_sslcommerz_payment(text,text,text,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.create_sslcommerz_transaction(uuid,text) to authenticated;
grant execute on function public.update_sslcommerz_session(uuid,text,text) to authenticated;
grant execute on function public.complete_sslcommerz_payment(text,text,text,numeric,text,text,text) to service_role;
