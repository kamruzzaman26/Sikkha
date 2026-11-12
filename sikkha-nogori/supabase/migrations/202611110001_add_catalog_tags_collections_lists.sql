-- Rokomari-style multi-dimensional catalog: tags, collections, curated lists,
-- entity SEO fields and primary-category safeguards. Additive only: no data is
-- deleted and no existing policy is changed.

-- 1. SEO fields for entity profile pages
alter table public.authors    add column if not exists description text, add column if not exists seo_title text, add column if not exists seo_description text;
alter table public.publishers add column if not exists seo_title text, add column if not exists seo_description text;
alter table public.brands     add column if not exists seo_title text, add column if not exists seo_description text;

-- 2. Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[^\s/]+$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, tag_id)
);
create index if not exists product_tags_tag_idx on public.product_tags(tag_id);

-- 3. Collections (manual or rule-based)
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[^\s/]+$'),
  description text,
  cover_image_url text,
  kind text not null default 'manual' check (kind in ('manual','rule')),
  rule jsonb not null default '{}'::jsonb,
  display_position text not null default 'none' check (display_position in ('none','homepage')),
  status text not null default 'draft' check (status in ('draft','published')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists collections_public_idx on public.collections(status, display_position, sort_order);
create table if not exists public.product_collections (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id)
);
create index if not exists product_collections_product_idx on public.product_collections(product_id);
create index if not exists product_collections_order_idx on public.product_collections(collection_id, position);

-- 4. Admin curated lists
create table if not exists public.curated_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[^\s/]+$'),
  description text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  show_on_homepage boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists curated_lists_public_idx on public.curated_lists(status, show_on_homepage, sort_order);
create table if not exists public.curated_list_products (
  list_id uuid not null references public.curated_lists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (list_id, product_id)
);
create index if not exists curated_list_products_product_idx on public.curated_list_products(product_id);
create index if not exists curated_list_products_order_idx on public.curated_list_products(list_id, position);

-- 5. updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['tags','collections','curated_lists'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end $$;

-- 6. Primary category safeguards (never raise, always self-heal)
create or replace function public.product_categories_first_is_primary()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.product_categories where product_id = new.product_id) then
    new.is_primary := true;
  end if;
  return new;
end $$;
drop trigger if exists product_categories_first_is_primary on public.product_categories;
create trigger product_categories_first_is_primary before insert on public.product_categories
  for each row execute function public.product_categories_first_is_primary();

create or replace function public.product_categories_promote_primary()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.is_primary and not exists (select 1 from public.product_categories where product_id = old.product_id and is_primary) then
    update public.product_categories set is_primary = true
    where (product_id, category_id) = (
      select product_id, category_id from public.product_categories
      where product_id = old.product_id order by created_at, category_id limit 1);
  end if;
  return null;
end $$;
drop trigger if exists product_categories_promote_primary on public.product_categories;
create trigger product_categories_promote_primary after delete on public.product_categories
  for each row execute function public.product_categories_promote_primary();

-- 7. Row level security: public reads only published data, admins manage all
alter table public.tags enable row level security;
alter table public.product_tags enable row level security;
alter table public.collections enable row level security;
alter table public.product_collections enable row level security;
alter table public.curated_lists enable row level security;
alter table public.curated_list_products enable row level security;

create policy tags_admin_manage on public.tags for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tags_public_read_active on public.tags for select using (is_active);
create policy product_tags_admin_manage on public.product_tags for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_tags_public_read on public.product_tags for select using (
  exists (select 1 from public.products p where p.id = product_tags.product_id and p.is_published and p.archived_at is null)
  and exists (select 1 from public.tags t where t.id = product_tags.tag_id and t.is_active));

create policy collections_admin_manage on public.collections for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy collections_public_read on public.collections for select using (
  status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy product_collections_admin_manage on public.product_collections for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_collections_public_read on public.product_collections for select using (
  exists (select 1 from public.products p where p.id = product_collections.product_id and p.is_published and p.archived_at is null)
  and exists (select 1 from public.collections c where c.id = product_collections.collection_id and c.status = 'published'
    and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at >= now())));

create policy curated_lists_admin_manage on public.curated_lists for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy curated_lists_public_read on public.curated_lists for select using (status = 'published');
create policy curated_list_products_admin_manage on public.curated_list_products for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy curated_list_products_public_read on public.curated_list_products for select using (
  exists (select 1 from public.products p where p.id = curated_list_products.product_id and p.is_published and p.archived_at is null)
  and exists (select 1 from public.curated_lists l where l.id = curated_list_products.list_id and l.status = 'published'));
