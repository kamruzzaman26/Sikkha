-- Read-only coupon check used by the checkout "Apply now" button.
-- It never changes anything; the real discount is applied by place_order_with_coupon.
create or replace function public.preview_coupon(p_code text, p_subtotal numeric)
returns table (status text, discount_percent numeric, discount numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c record;
  normalized text := upper(btrim(coalesce(p_code, '')));
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if normalized !~ '^[A-Z0-9]{3,20}$' then
    return query select 'not_found'::text, 0::numeric, 0::numeric; return;
  end if;
  select * into c from public.coupons where code = normalized;
  if not found then
    return query select 'not_found'::text, 0::numeric, 0::numeric; return;
  end if;
  if not c.is_active then return query select 'inactive'::text, 0::numeric, 0::numeric; return; end if;
  if c.starts_at is not null and c.starts_at > now() then
    return query select 'not_started'::text, 0::numeric, 0::numeric; return;
  end if;
  if c.expires_at is not null and c.expires_at <= now() then
    return query select 'expired'::text, 0::numeric, 0::numeric; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select 'used_up'::text, 0::numeric, 0::numeric; return;
  end if;
  if coalesce(p_subtotal, 0) < c.min_order_amount then
    return query select 'min_order'::text, c.discount_percent, 0::numeric; return;
  end if;
  return query select 'ok'::text, c.discount_percent, round(p_subtotal * c.discount_percent / 100, 2);
end;
$$;
revoke all on function public.preview_coupon(text, numeric) from public, anon;
grant execute on function public.preview_coupon(text, numeric) to authenticated;
