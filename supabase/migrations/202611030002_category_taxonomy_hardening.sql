-- Builds on 202611030001_category_taxonomy (already applied to the live DB).
-- categories and category_import_sources are empty at the time of writing.

-- 1. Source tracking, image and SEO columns
alter table public.categories
  add column if not exists source text,
  add column if not exists source_ref text,
  add column if not exists image_url text,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

-- Same rokomari category id can only be imported once
create unique index if not exists categories_source_ref_uidx
  on public.categories (source, source_ref)
  where source_ref is not null;

-- 2. Slug unique per group instead of globally (books/products/electronics
--    can legitimately share a slug such as "exercise-fitness")
alter table public.categories drop constraint if exists categories_slug_key;
create unique index if not exists categories_group_slug_uidx
  on public.categories (category_group, slug);

-- 3. Hierarchy integrity: parent in same group, no cycles, bounded depth
create or replace function public.enforce_category_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_group text;
  depth integer := 0;
  cursor_id uuid := new.parent_id;
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'category cannot be its own parent' using errcode = '23514';
  end if;

  select category_group into parent_group
  from public.categories where id = new.parent_id;
  if parent_group is distinct from new.category_group then
    raise exception 'parent must be in the same category group' using errcode = '23514';
  end if;

  while cursor_id is not null loop
    depth := depth + 1;
    if depth > 8 or cursor_id = new.id then
      raise exception 'category hierarchy too deep or cyclic' using errcode = '23514';
    end if;
    select parent_id into cursor_id from public.categories where id = cursor_id;
  end loop;

  return new;
end;
$$;
drop trigger if exists categories_enforce_hierarchy on public.categories;
create trigger categories_enforce_hierarchy
  before insert or update of parent_id, category_group on public.categories
  for each row execute function public.enforce_category_hierarchy();

-- 4. Source review table: never store the source site's marketing text
alter table public.category_import_sources
  drop column if exists source_description,
  add column if not exists category_ref text;
create unique index if not exists category_import_sources_ref_uidx
  on public.category_import_sources (source, category_ref)
  where category_ref is not null;

-- 5. Product <-> category (many-to-many). products.category text stays.
create table if not exists public.product_categories (
  product_id  uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (product_id, category_id)
);
create unique index if not exists product_categories_one_primary_uidx
  on public.product_categories (product_id) where is_primary;
create index if not exists product_categories_category_idx
  on public.product_categories (category_id);

alter table public.product_categories enable row level security;
revoke all on public.product_categories from anon, authenticated;
grant select on public.product_categories to anon, authenticated;
grant insert, update, delete on public.product_categories to authenticated;

drop policy if exists "Public reads product categories" on public.product_categories;
create policy "Public reads product categories" on public.product_categories
  for select to anon, authenticated
  using (
    exists (select 1 from public.categories c
            where c.id = category_id and c.is_active)
  );

drop policy if exists "Admins manage product categories" on public.product_categories;
create policy "Admins manage product categories" on public.product_categories
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 6. Column grants for the new categories columns
grant select (source, source_ref, image_url, seo_title, seo_description)
  on public.categories to anon, authenticated;
grant insert (source, source_ref, image_url, seo_title, seo_description)
  on public.categories to authenticated;
grant update (source, source_ref, image_url, seo_title, seo_description)
  on public.categories to authenticated;
