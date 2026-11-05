-- Inventory movements and manual/automatic product pricing.
alter table public.products
  add column if not exists cost_price numeric(12,2),
  add column if not exists pricing_mode text not null default 'manual',
  add column if not exists markup_percent numeric(7,2) not null default 0;

alter table public.products
  drop constraint if exists products_cost_price_check,
  add constraint products_cost_price_check
    check (cost_price is null or cost_price >= 0),
  drop constraint if exists products_pricing_mode_check,
  add constraint products_pricing_mode_check
    check (pricing_mode in ('manual', 'automatic')),
  drop constraint if exists products_markup_percent_check,
  add constraint products_markup_percent_check
    check (markup_percent >= 0 and markup_percent <= 10000);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening', 'stock_in', 'stock_out', 'adjustment')),
  quantity_change integer not null check (quantity_change <> 0),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_product_created_idx
  on public.inventory_movements(product_id, created_at desc);

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  old_price numeric(12,2),
  new_price numeric(12,2) not null check (new_price >= 0),
  old_cost_price numeric(12,2),
  new_cost_price numeric(12,2),
  pricing_mode text not null check (pricing_mode in ('manual', 'automatic')),
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists product_price_history_product_created_idx
  on public.product_price_history(product_id, created_at desc);

alter table public.inventory_movements enable row level security;
alter table public.product_price_history enable row level security;
revoke all on public.inventory_movements, public.product_price_history from anon, authenticated;
grant select, insert on public.inventory_movements to authenticated;
grant select, insert on public.product_price_history to authenticated;

drop policy if exists "Admins read inventory movements" on public.inventory_movements;
create policy "Admins read inventory movements" on public.inventory_movements
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins insert inventory movements" on public.inventory_movements;
create policy "Admins insert inventory movements" on public.inventory_movements
  for insert to authenticated with check ((select public.is_admin()) and (created_by is null or created_by = (select auth.uid())));
drop policy if exists "Admins read product price history" on public.product_price_history;
create policy "Admins read product price history" on public.product_price_history
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins insert product price history" on public.product_price_history;
create policy "Admins insert product price history" on public.product_price_history
  for insert to authenticated with check ((select public.is_admin()) and (changed_by is null or changed_by = (select auth.uid())));
