-- Public in-stock flag for in-house products. Exposes ONLY product_id and a boolean,
-- never quantities, SKUs or thresholds. Items without an inventory row are not listed.
create or replace view public.public_product_stock
with (security_invoker = false) as
select pi.product_id, (pi.stock_quantity > 0) as in_stock, least(pi.stock_quantity, 50) as available_copies
from public.product_inventory pi
join public.products p on p.id = pi.product_id
where p.is_published = true and p.archived_at is null;

revoke all on public.public_product_stock from public, anon, authenticated;
grant select on public.public_product_stock to anon, authenticated;
