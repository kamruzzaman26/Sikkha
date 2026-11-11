-- Rokomari-inspired delivery charge tiers. The charge is stored on the order
-- and added after coupon discounts, so discounts never reduce shipping.
alter table public.orders
  add column shipping_zone text,
  add column shipping_charge numeric(12, 2) not null default 0
    constraint orders_shipping_charge_check check (shipping_charge >= 0 and shipping_charge <= 100000),
  add constraint orders_shipping_zone_check
    check (shipping_zone is null or shipping_zone in ('dhaka_city', 'district_town', 'remote_union', 'no_shipping'));

-- Keep the existing 8-argument coupon/order function intact for compatibility.
-- This overload applies a server-validated delivery charge after coupon logic.
create or replace function public.place_order_with_coupon(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_payment_method_id uuid,
  p_items jsonb,
  p_referral_code text,
  p_coupon_code text,
  p_shipping_zone text,
  p_shipping_charge numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  new_order_id uuid;
  expected_charge numeric(12, 2);
  has_physical_items boolean;
begin
  if requesting_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  expected_charge := case p_shipping_zone
    when 'dhaka_city' then 48
    when 'district_town' then 52
    when 'remote_union' then 57
    when 'no_shipping' then 0
    else null
  end;

  if expected_charge is null or p_shipping_charge is distinct from expected_charge then
    raise exception 'Invalid delivery charge selection.' using errcode = '22023';
  end if;

  new_order_id := public.place_order_with_coupon(
    p_idempotency_key,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    p_payment_method_id,
    p_items,
    p_referral_code,
    p_coupon_code
  );

  select exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = new_order_id
      and p.product_type not in ('course', 'ebook', 'digital')
  ) into has_physical_items;

  if (has_physical_items and p_shipping_zone = 'no_shipping')
    or (not has_physical_items and p_shipping_zone <> 'no_shipping') then
    raise exception 'Delivery zone does not match the order contents.' using errcode = '22023';
  end if;

  -- Idempotent retries replace the stored charge rather than adding it twice.
  update public.orders
  set total_amount = total_amount - shipping_charge + p_shipping_charge,
      shipping_zone = p_shipping_zone,
      shipping_charge = p_shipping_charge,
      updated_at = now()
  where id = new_order_id
    and user_id = requesting_user;

  if not found then
    raise exception 'Order not found for current customer.' using errcode = 'P0002';
  end if;

  return new_order_id;
end;
$$;

revoke all on function public.place_order_with_coupon(uuid, text, text, text, uuid, jsonb, text, text, text, numeric) from public, anon;
grant execute on function public.place_order_with_coupon(uuid, text, text, text, uuid, jsonb, text, text, text, numeric) to authenticated;
