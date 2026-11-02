-- Category taxonomy foundation for the Rokomari-style catalogue.
-- This migration is prepared on feature/category-import only; it has NOT been run.
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete restrict,
  add column if not exists name_en text,
  add column if not exists category_group text not null default 'books',
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

alter table public.categories
  drop constraint if exists categories_category_group_check;
alter table public.categories
  add constraint categories_category_group_check
  check (category_group in ('books', 'products', 'electronics'));

create index if not exists categories_parent_sort_idx
  on public.categories (parent_id, sort_order, name);
create index if not exists categories_group_active_sort_idx
  on public.categories (category_group, is_active, sort_order);

create table if not exists public.category_import_sources (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'rokomari',
  source_section text not null
    check (source_section in ('book', 'product', 'electronics')),
  source_url text not null unique,
  source_title text not null,
  source_description text,
  suggested_slug text,
  parent_category_id uuid references public.categories(id) on delete set null,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'assigned', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_import_source_url_check
    check (source_url ~ '^https://www\\.rokomari\\.com/')
);

create index if not exists category_import_sources_review_idx
  on public.category_import_sources (review_status, source_section, source_title);

alter table public.category_import_sources enable row level security;
revoke all on public.category_import_sources from anon, authenticated;
grant select, insert, update, delete on public.category_import_sources to authenticated;

drop policy if exists "Admins manage category import sources"
  on public.category_import_sources;
create policy "Admins manage category import sources"
  on public.category_import_sources
  for all to authenticated
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

drop policy if exists "Read categories" on public.categories;
drop policy if exists "Public reads active category tree"
  on public.categories;
create policy "Public reads active category tree"
  on public.categories
  for select to anon, authenticated
  using (is_active);

-- Existing category policies and product.category text remain intact.
