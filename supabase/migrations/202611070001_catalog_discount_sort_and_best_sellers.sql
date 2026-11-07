-- Applied live as catalog_discount_sort_and_best_sellers.
alter table public.products
  add column if not exists discount_percent numeric
  generated always as (
    case when list_price is not null and price is not null and list_price > 0 and list_price > price
      then round((list_price - price) / list_price * 100, 2) else 0 end
  ) stored;
create index if not exists products_discount_percent_idx on public.products (discount_percent);
grant select (discount_percent) on public.products to anon, authenticated;

create or replace function public.best_selling_product_ids(p_limit integer default 500)
returns table (product_id uuid, units bigint)
language sql stable security definer set search_path = public
as $$
  select oi.product_id, sum(oi.quantity)::bigint as units
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.payment_status::text = 'verified' and oi.product_id is not null
  group by oi.product_id
  order by units desc
  limit greatest(1, least(coalesce(p_limit, 500), 1000));
$$;
revoke all on function public.best_selling_product_ids(integer) from public;
grant execute on function public.best_selling_product_ids(integer) to anon, authenticated;
