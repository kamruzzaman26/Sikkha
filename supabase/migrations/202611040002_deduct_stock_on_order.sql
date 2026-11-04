-- Deduct tracked stock atomically when order items are created.
create or replace function public.deduct_inventory_for_order_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_qty integer;
begin
  select stock_quantity into before_qty
  from public.product_inventory
  where product_id = new.product_id
  for update;

  -- Products without an inventory row remain untracked (legacy behavior).
  if not found then
    return new;
  end if;

  if before_qty < new.quantity then
    raise exception 'Insufficient stock for product %.', new.product_title
      using errcode = '23514';
  end if;

  update public.product_inventory
  set stock_quantity = before_qty - new.quantity,
      updated_at = now()
  where product_id = new.product_id;

  insert into public.inventory_movements (
    product_id, movement_type, quantity_change,
    quantity_before, quantity_after, note, created_by
  ) values (
    new.product_id, 'stock_out', -new.quantity,
    before_qty, before_qty - new.quantity,
    'Order ' || new.order_id::text, null
  );

  return new;
end;
$$;

drop trigger if exists order_item_deduct_inventory on public.order_items;
create trigger order_item_deduct_inventory
after insert on public.order_items
for each row execute function public.deduct_inventory_for_order_item();

revoke all on function public.deduct_inventory_for_order_item() from public, anon, authenticated;
