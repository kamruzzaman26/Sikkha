-- Restore the optional category field expected by the admin product form.
-- Safe for databases where the column already exists.
alter table public.products
  add column if not exists category text;

grant select (category)
  on public.products to anon, authenticated;
