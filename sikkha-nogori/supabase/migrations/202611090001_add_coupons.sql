-- Coupons: percentage discounts, with or without an expiry date.
-- The admin can switch each coupon on/off at any time and choose whether it is
-- advertised on the checkout page. Everything is additive; the existing
-- place_order functions are untouched.

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null default '',
  discount_percent numeric(5, 2) not null,
  starts_at timestamptz,
  expires_at timestamptz,
  min_order_amount numeric(12, 2) not null default 0,
  usage_limit integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  show_publicly boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_format check (code ~ '^[A-Z0-9]{3,20}$'),
  constraint coupons_percent_range check (discount_percent > 0 and discount_percent <= 90),
  constraint coupons_min_order_check check (min_order_amount >= 0),
  constraint coupons_usage_limit_check check (usage_limit is null or usage_limit > 0),
  constraint coupons_dates_check check (starts_at is null or expires_at is null or expires_at > starts_at)
);
create unique index coupons_code_key on public.coupons (code);

alter table public.coupons enable row level security;
create policy "Admins manage coupons" on public.coupons
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid not null,
  discount_amount numeric(20, 2) not null,
  created_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_id_idx on public.coupon_redemptions (coupon_id);
alter table public.coupon_redemptions enable row level security;
create policy "Admins read coupon redemptions" on public.coupon_redemptions
  for select to authenticated
  using ((select public.is_admin()));

alter table public.orders
  add column coupon_code text,
  add column discount_amount numeric(20, 2) not null default 0
    constraint orders_discount_amount_check check (discount_amount >= 0);

-- Coupons the admin chose to advertise (active, started, not expired, not used up).
create or replace function public.get_public_coupons()
returns table (code text, description text, discount_percent numeric, expires_at timestamptz, min_order_amount numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select c.code, c.description, c.discount_percent, c.expires_at, c.min_order_amount
  from public.coupons c
  where c.is_active
    and c.show_publicly
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at > now())
    and (c.usage_limit is null or c.used_count < c.usage_limit)
  order by c.discount_percent desc, c.code;
$$;
revoke all on function public.get_public_coupons() from public;
grant execute on function public.get_public_coupons() to anon, authenticated;

-- Places an order exactly like place_order_with_referral, then applies a coupon
-- inside the same transaction. An invalid coupon aborts the whole order
-- (errcode 22023, message = reason) so nothing is half-applied.
create or replace function public.place_order_with_coupon(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_payment_method_id uuid,
  p_items jsonb,
  p_referral_code text default null,
  p_coupon_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  new_order_id uuid;
  order_row record;
  coupon_row record;
  normalized_code text := upper(btrim(coalesce(p_coupon_code, '')));
  discount numeric(20, 2);
begin
  if requesting_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  new_order_id := public.place_order_with_referral(
    p_idempotency_key, p_customer_name, p_customer_phone, p_delivery_address,
    p_payment_method_id, p_items, p_referral_code
  );

  if normalized_code = '' then
    return new_order_id;
  end if;

  select id, total_amount, created_at into order_row
  from public.orders where id = new_order_id and user_id = requesting_user;
  -- A replayed (idempotent) request returns the older order untouched.
  if order_row.created_at <> now() then
    return new_order_id;
  end if;

  if normalized_code !~ '^[A-Z0-9]{3,20}$' then
    raise exception 'coupon_not_found' using errcode = '22023';
  end if;

  select * into coupon_row from public.coupons where code = normalized_code for update;
  if not found then raise exception 'coupon_not_found' using errcode = '22023'; end if;
  if not coupon_row.is_active then raise exception 'coupon_inactive' using errcode = '22023'; end if;
  if coupon_row.starts_at is not null and coupon_row.starts_at > now() then
    raise exception 'coupon_not_started' using errcode = '22023';
  end if;
  if coupon_row.expires_at is not null and coupon_row.expires_at <= now() then
    raise exception 'coupon_expired' using errcode = '22023';
  end if;
  if coupon_row.usage_limit is not null and coupon_row.used_count >= coupon_row.usage_limit then
    raise exception 'coupon_used_up' using errcode = '22023';
  end if;
  if order_row.total_amount < coupon_row.min_order_amount then
    raise exception 'coupon_min_order' using errcode = '22023';
  end if;

  discount := round(order_row.total_amount * coupon_row.discount_percent / 100, 2);

  update public.orders
  set total_amount = total_amount - discount,
      discount_amount = discount,
      coupon_code = normalized_code,
      updated_at = now()
  where id = new_order_id;

  update public.affiliate_order_referrals
  set order_total = order_row.total_amount - discount
  where order_id = new_order_id;

  update public.coupons set used_count = used_count + 1, updated_at = now() where id = coupon_row.id;

  insert into public.coupon_redemptions (coupon_id, order_id, user_id, discount_amount)
  values (coupon_row.id, new_order_id, requesting_user, discount);

  return new_order_id;
end;
$$;
revoke all on function public.place_order_with_coupon(uuid, text, text, text, uuid, jsonb, text, text) from public, anon;
grant execute on function public.place_order_with_coupon(uuid, text, text, text, uuid, jsonb, text, text) to authenticated;
