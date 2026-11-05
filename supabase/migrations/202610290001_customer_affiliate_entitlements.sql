create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  phone text not null default '' check (char_length(phone) <= 25),
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from public, anon, authenticated;
grant select (user_id, display_name, phone, account_status, created_at, updated_at)
  on public.customer_profiles to authenticated;
grant update (display_name, phone, updated_at)
  on public.customer_profiles to authenticated;

drop policy if exists "Customers and admins can read profiles"
  on public.customer_profiles;
create policy "Customers and admins can read profiles"
  on public.customer_profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Customers and admins can update profiles"
  on public.customer_profiles;
create policy "Customers and admins can update profiles"
  on public.customer_profiles
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_profiles (user_id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_customer_profile_after_signup on auth.users;
create trigger create_customer_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_customer_profile();

insert into public.customer_profiles (user_id, display_name)
select id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 100)
from auth.users
on conflict (user_id) do nothing;

create or replace function public.admin_set_customer_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or not exists (
    select 1 from public.admin_users
    where user_id = requesting_user and role = 'admin'
  ) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_user_id is null or p_status is null
    or p_status not in ('active', 'suspended')
  then
    raise exception 'Invalid customer status.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.admin_users where user_id = p_user_id
  ) then
    raise exception 'Admin accounts cannot be suspended here.'
      using errcode = '23514';
  end if;

  update public.customer_profiles
  set account_status = p_status, updated_at = now()
  where user_id = p_user_id;
  if not found then
    raise exception 'Customer not found.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  phone text,
  account_status text,
  access_role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or not exists (
    select 1 from public.admin_users
    where user_id = requesting_user and role = 'admin'
  ) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  return query
  select auth_user.id,
    auth_user.email::text,
    profile.display_name,
    profile.phone,
    profile.account_status,
    case
      when admin.role is not null then admin.role
      when affiliate.status = 'active' then 'affiliate'
      when affiliate.status = 'suspended' then 'affiliate (suspended)'
      else 'customer'
    end
  from auth.users auth_user
  join public.customer_profiles profile on profile.user_id = auth_user.id
  left join public.admin_users admin on admin.user_id = auth_user.id
  left join public.affiliate_accounts affiliate on affiliate.user_id = auth_user.id
  order by auth_user.created_at desc
  limit 500;
end;
$$;

create table if not exists public.affiliate_applications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

alter table public.affiliate_applications enable row level security;
revoke all on public.affiliate_applications from public, anon, authenticated;
grant select (user_id, status, created_at, reviewed_at)
  on public.affiliate_applications to authenticated;
grant insert (user_id) on public.affiliate_applications to authenticated;
grant update (status, reviewed_at, reviewed_by)
  on public.affiliate_applications to authenticated;

drop policy if exists "Customers and admins can read affiliate applications"
  on public.affiliate_applications;
create policy "Customers and admins can read affiliate applications"
  on public.affiliate_applications
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Customers can apply for affiliate membership"
  on public.affiliate_applications;
create policy "Customers can apply for affiliate membership"
  on public.affiliate_applications
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Admins can review affiliate applications"
  on public.affiliate_applications;
create policy "Admins can review affiliate applications"
  on public.affiliate_applications
  for update
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create table if not exists public.affiliate_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  referral_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table public.affiliate_accounts enable row level security;
revoke all on public.affiliate_accounts from public, anon, authenticated;
grant select (user_id, referral_code, status, created_at)
  on public.affiliate_accounts to authenticated;

drop policy if exists "Affiliates and admins can read affiliate accounts"
  on public.affiliate_accounts;
create policy "Affiliates and admins can read affiliate accounts"
  on public.affiliate_accounts
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

alter table public.orders
  add column if not exists payment_refund_reason text;

alter table public.orders
  drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (
    payment_status in (
      'awaiting', 'submitted', 'verified', 'rejected',
      'failed', 'cancelled', 'refunded'
    )
  );
grant select (payment_refund_reason) on public.orders to authenticated;

create or replace function public.enforce_active_customer_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id = auth.uid() and not exists (
    select 1 from public.customer_profiles
    where user_id = new.user_id and account_status = 'active'
  ) then
    raise exception 'Active customer account required.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_active_customer_order_before_write
  on public.orders;
create trigger enforce_active_customer_order_before_write
  before insert or update on public.orders
  for each row execute function public.enforce_active_customer_order();

drop policy if exists "Restrict orders to active customers and admins"
  on public.orders;
create policy "Restrict orders to active customers and admins"
  on public.orders
  as restrictive
  for select
  to authenticated
  using (
    exists (
      select 1 from public.customer_profiles
      where user_id = (select auth.uid()) and account_status = 'active'
    )
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create table if not exists public.affiliate_order_referrals (
  order_id uuid primary key references public.orders (id) on delete cascade,
  affiliate_user_id uuid not null
    references public.affiliate_accounts (user_id) on delete restrict,
  order_total numeric(14, 2) not null check (order_total >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'converted', 'void')),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_order_referrals_owner_created_idx
  on public.affiliate_order_referrals (affiliate_user_id, created_at desc);
alter table public.affiliate_order_referrals enable row level security;
revoke all on public.affiliate_order_referrals from public, anon, authenticated;
grant select (order_id, affiliate_user_id, order_total, status, created_at)
  on public.affiliate_order_referrals to authenticated;

drop policy if exists "Affiliates and admins can read referral statistics"
  on public.affiliate_order_referrals;
create policy "Affiliates and admins can read referral statistics"
  on public.affiliate_order_referrals
  for select
  to authenticated
  using (
    (
      affiliate_user_id = (select auth.uid())
      and exists (
        select 1 from public.affiliate_accounts
        where user_id = (select auth.uid()) and status = 'active'
      )
    )
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create or replace function public.get_my_affiliate_stats()
returns table (
  referral_count bigint,
  converted_count bigint,
  converted_total numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or not exists (
    select 1 from public.affiliate_accounts
    where user_id = requesting_user and status = 'active'
  ) then
    raise exception 'Active affiliate access required.'
      using errcode = '42501';
  end if;

  return query
  select count(*)::bigint,
    count(*) filter (where status = 'converted')::bigint,
    coalesce(sum(order_total) filter (where status = 'converted'), 0)::numeric
  from public.affiliate_order_referrals
  where affiliate_user_id = requesting_user;
end;
$$;

create or replace function public.sync_affiliate_order_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.affiliate_order_referrals
  set status = case
    when new.payment_status = 'verified' and new.status <> 'cancelled'
      then 'converted'
    when new.payment_status in ('rejected', 'failed', 'cancelled', 'refunded')
      or new.status = 'cancelled'
      then 'void'
    else 'pending'
  end
  where order_id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_affiliate_order_referral_after_order_change
  on public.orders;
create trigger sync_affiliate_order_referral_after_order_change
  after insert or update of status, payment_status on public.orders
  for each row execute function public.sync_affiliate_order_referral();

create table if not exists public.product_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (order_id, product_id)
);

create index if not exists product_entitlements_owner_status_idx
  on public.product_entitlements (user_id, status, granted_at desc);
alter table public.product_entitlements enable row level security;
revoke all on public.product_entitlements from public, anon, authenticated;
grant select (id, user_id, product_id, order_id, status, granted_at, revoked_at)
  on public.product_entitlements to authenticated;

drop policy if exists "Customers and admins can read product entitlements"
  on public.product_entitlements;
create policy "Customers and admins can read product entitlements"
  on public.product_entitlements
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Restrict entitlements to active customers and admins"
  on public.product_entitlements;
create policy "Restrict entitlements to active customers and admins"
  on public.product_entitlements
  as restrictive
  for select
  to authenticated
  using (
    exists (
      select 1 from public.customer_profiles
      where user_id = (select auth.uid()) and account_status = 'active'
    )
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create or replace function public.sync_product_entitlements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_status = 'verified' and new.status <> 'cancelled' then
    insert into public.product_entitlements (
      user_id, product_id, order_id, status, granted_at, revoked_at
    )
    select new.user_id, item.product_id, new.id, 'active', now(), null
    from public.order_items item
    where item.order_id = new.id
    on conflict (order_id, product_id) do update
      set status = 'active', revoked_at = null;
  else
    update public.product_entitlements
    set status = 'revoked', revoked_at = coalesce(revoked_at, now())
    where order_id = new.id and status <> 'revoked';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_product_entitlements_after_order_change
  on public.orders;
create trigger sync_product_entitlements_after_order_change
  after insert or update of status, payment_status on public.orders
  for each row execute function public.sync_product_entitlements();

insert into public.product_entitlements (user_id, product_id, order_id)
select orders.user_id, item.product_id, orders.id
from public.orders
join public.order_items item on item.order_id = orders.id
where orders.payment_status = 'verified'
  and orders.status <> 'cancelled'
on conflict (order_id, product_id) do nothing;

create table if not exists public.product_resources (
  product_id uuid primary key references public.products (id) on delete cascade,
  storage_path text not null unique
    check (char_length(storage_path) between 1 and 500)
    check (storage_path !~ '(^/|(^|/)\.\.?(/|$))'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_resources enable row level security;
revoke all on public.product_resources from public, anon, authenticated;
grant select (product_id, storage_path, created_at, updated_at)
  on public.product_resources to authenticated;
grant insert (product_id, storage_path) on public.product_resources to authenticated;
grant update (storage_path, updated_at) on public.product_resources to authenticated;
grant delete on public.product_resources to authenticated;

drop policy if exists "Entitled customers and admins can read product resources"
  on public.product_resources;
create policy "Entitled customers and admins can read product resources"
  on public.product_resources
  for select
  to authenticated
  using (
    exists (
      select 1 from public.product_entitlements entitlement
      where entitlement.product_id = product_resources.product_id
        and entitlement.user_id = (select auth.uid())
        and entitlement.status = 'active'
    )
    or exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Admins can manage product resources"
  on public.product_resources;
create policy "Admins can manage product resources"
  on public.product_resources
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

do $$
begin
  if exists (
    select 1 from storage.buckets
    where id = 'sikkha-protected-products' and public
  ) then
    raise exception 'The sikkha-protected-products bucket already exists as public.';
  end if;

  insert into storage.buckets (id, name, public)
  values ('sikkha-protected-products', 'sikkha-protected-products', false)
  on conflict (id) do nothing;
end;
$$;

drop policy if exists "Entitled customers can read protected product files"
  on storage.objects;
create policy "Entitled customers can read protected product files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'sikkha-protected-products'
    and exists (
      select 1
      from public.product_resources resource
      join public.product_entitlements entitlement
        on entitlement.product_id = resource.product_id
      where resource.storage_path = name
        and entitlement.user_id = (select auth.uid())
        and entitlement.status = 'active'
    )
  );

drop policy if exists "Admins can manage protected product files"
  on storage.objects;
create policy "Admins can manage protected product files"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'sikkha-protected-products'
    and exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    bucket_id = 'sikkha-protected-products'
    and exists (
      select 1 from public.admin_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create or replace function public.place_order_with_referral(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_payment_method_id uuid,
  p_items jsonb,
  p_referral_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  selected_affiliate_user uuid;
  created_order_id uuid;
begin
  if requesting_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_referral_code is not null
    and char_length(btrim(p_referral_code)) between 1 and 32
    and btrim(p_referral_code) ~ '^[A-Za-z0-9]+$'
  then
    select user_id into selected_affiliate_user
    from public.affiliate_accounts
    where referral_code = upper(btrim(p_referral_code))
      and status = 'active'
      and user_id <> requesting_user;
  end if;

  created_order_id := public.place_order(
    p_idempotency_key,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    p_payment_method_id,
    p_items
  );

  if selected_affiliate_user is not null then
    insert into public.affiliate_order_referrals (
      order_id, affiliate_user_id, order_total, status
    )
    select id, selected_affiliate_user, total_amount,
      case
        when payment_status = 'verified' and status <> 'cancelled'
          then 'converted'
        when payment_status in ('rejected', 'failed', 'cancelled', 'refunded')
          or status = 'cancelled'
          then 'void'
        else 'pending'
      end
    from public.orders
    where id = created_order_id and user_id = requesting_user
    on conflict (order_id) do nothing;
  end if;

  return created_order_id;
end;
$$;

create or replace function public.admin_review_affiliate(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or not exists (
    select 1 from public.admin_users
    where user_id = requesting_user and role = 'admin'
  ) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_user_id is null or p_status is null
    or p_status not in ('approved', 'rejected', 'suspended')
  then
    raise exception 'Invalid affiliate review.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.affiliate_applications where user_id = p_user_id
  ) then
    raise exception 'Affiliate application not found.' using errcode = 'P0002';
  end if;

  update public.affiliate_applications
  set status = case when p_status = 'suspended' then 'approved' else p_status end,
      reviewed_at = now(),
      reviewed_by = requesting_user
  where user_id = p_user_id;

  if p_status = 'approved' then
    insert into public.affiliate_accounts (user_id, status)
    values (p_user_id, 'active')
    on conflict (user_id) do update set status = 'active';
  elsif p_status in ('rejected', 'suspended') then
    update public.affiliate_accounts
    set status = 'suspended'
    where user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.admin_record_order_refund(
  p_order_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or not exists (
    select 1 from public.admin_users
    where user_id = requesting_user and role = 'admin'
  ) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_order_id is null
    or p_reason is null
    or char_length(btrim(p_reason)) not between 3 and 500
  then
    raise exception 'A valid refund reason is required.' using errcode = '23514';
  end if;

  update public.orders
  set payment_status = 'refunded',
      payment_refund_reason = btrim(p_reason),
      payment_reviewed_at = now(),
      payment_reviewed_by = requesting_user,
      updated_at = now()
  where id = p_order_id and payment_status = 'verified'
  returning id into p_order_id;

  if p_order_id is null then
    raise exception 'Verified order not found.' using errcode = 'P0002';
  end if;
  return p_order_id;
end;
$$;

revoke all on function public.create_customer_profile() from public, anon, authenticated;
revoke all on function public.sync_affiliate_order_referral() from public, anon, authenticated;
revoke all on function public.get_my_affiliate_stats() from public, anon;
revoke all on function public.sync_product_entitlements() from public, anon, authenticated;
revoke all on function public.place_order_with_referral(uuid, text, text, text, uuid, jsonb, text)
  from public, anon;
revoke all on function public.admin_review_affiliate(uuid, text) from public, anon;
revoke all on function public.admin_record_order_refund(uuid, text) from public, anon;
revoke all on function public.admin_set_customer_status(uuid, text) from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.enforce_active_customer_order() from public, anon, authenticated;
grant execute on function public.place_order_with_referral(uuid, text, text, text, uuid, jsonb, text)
  to authenticated;
grant execute on function public.get_my_affiliate_stats() to authenticated;
grant execute on function public.admin_review_affiliate(uuid, text) to authenticated;
grant execute on function public.admin_record_order_refund(uuid, text) to authenticated;
grant execute on function public.admin_set_customer_status(uuid, text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
