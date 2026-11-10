-- Phase 3.4: normalized catalog entities and affiliate-link soft deletion
-- Existing product text fields and existing product/category workflows are preserved.

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  name_en text,
  slug text not null unique,
  biography text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  name_en text,
  slug text not null unique,
  description text,
  logo_url text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  name_en text,
  slug text not null unique,
  description text,
  logo_url text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creators (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  name_en text,
  slug text not null unique,
  creator_type text not null default 'other'
    check (creator_type in ('author', 'instructor', 'content_creator', 'artist', 'other')),
  biography text,
  profile_image_url text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_authors (
  product_id uuid not null references public.products(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, author_id)
);
create unique index product_authors_one_primary_per_product
  on public.product_authors(product_id) where is_primary;

create table public.product_publishers (
  product_id uuid not null references public.products(id) on delete cascade,
  publisher_id uuid not null references public.publishers(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, publisher_id)
);
create unique index product_publishers_one_primary_per_product
  on public.product_publishers(product_id) where is_primary;

create table public.product_brands (
  product_id uuid not null references public.products(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, brand_id)
);
create unique index product_brands_one_primary_per_product
  on public.product_brands(product_id) where is_primary;

create table public.product_creators (
  product_id uuid not null references public.products(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, creator_id)
);
create unique index product_creators_one_primary_per_product
  on public.product_creators(product_id) where is_primary;

-- Backfill only clear, non-placeholder legacy values. Original text columns remain untouched.
insert into public.authors (name, slug)
select distinct btrim(p.author), 'author-' || substr(md5(btrim(p.author)), 1, 16)
from public.products p
where nullif(btrim(p.author), '') is not null
  and btrim(p.author) not in ('Sample Author', 'ডেমো পণ্য', 'ফাঁকা রাখ')
on conflict (slug) do nothing;

insert into public.product_authors (product_id, author_id, is_primary)
select p.id, a.id,
       row_number() over (partition by p.id order by a.name) = 1
from public.products p
join public.authors a
  on a.name = btrim(p.author)
where nullif(btrim(p.author), '') is not null
  and btrim(p.author) not in ('Sample Author', 'ডেমো পণ্য', 'ফাঁকা রাখ')
on conflict (product_id, author_id) do nothing;

insert into public.publishers (name, slug)
select distinct btrim(p.publisher), 'publisher-' || substr(md5(btrim(p.publisher)), 1, 16)
from public.products p
where nullif(btrim(p.publisher), '') is not null
  and btrim(p.publisher) <> 'Sample Author'
on conflict (slug) do nothing;

insert into public.product_publishers (product_id, publisher_id, is_primary)
select p.id, pub.id,
       row_number() over (partition by p.id order by pub.name) = 1
from public.products p
join public.publishers pub
  on pub.name = btrim(p.publisher)
where nullif(btrim(p.publisher), '') is not null
  and btrim(p.publisher) <> 'Sample Author'
on conflict (product_id, publisher_id) do nothing;

-- Soft deletion is reversible; is_active retains its pre-delete value.
alter table public.affiliate_links
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null,
  add column delete_reason text;

create index affiliate_links_deleted_at_idx
  on public.affiliate_links(deleted_at) where deleted_at is not null;

-- Remove overlapping policies that allowed public rows through an ALL policy.
drop policy if exists "Admin manages affiliate links" on public.affiliate_links;
drop policy if exists "Admins can manage affiliate links" on public.affiliate_links;
drop policy if exists "Restrict affiliate links to active public rows or admins" on public.affiliate_links;
drop policy if exists "Public can read active affiliate links" on public.affiliate_links;

create policy "Public can read active affiliate links"
on public.affiliate_links
for select
to anon, authenticated
using (
  deleted_at is null
  and is_active
  and exists (
    select 1 from public.products p
    where p.id = affiliate_links.product_id
      and p.is_published
      and p.archived_at is null
      and p.commerce_mode = 'affiliate'
  )
  and exists (
    select 1 from public.affiliate_partner_domains d
    where d.partner = affiliate_links.partner
      and d.hostname = lower(substring(lower(affiliate_links.url), '^https://([^/:?#]+)'))
  )
);

create policy "Admins manage affiliate links"
on public.affiliate_links
for all
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.role in ('admin', 'editor')
  )
)
with check (
  (select public.is_admin())
  or exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.role in ('admin', 'editor')
  )
);

-- Entity and product-relation access: public can read active entities attached to
-- published, non-archived products; existing admins retain management access.
do $$
declare
  t text;
begin
  foreach t in array array['authors','publishers','brands','creators'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (is_active)',
      t || '_public_read_active', t
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t || '_admin_manage', t
    );
  end loop;

  foreach t in array array['product_authors','product_publishers','product_brands','product_creators'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_published and p.archived_at is null))',
      t || '_public_read_published', t
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t || '_admin_manage', t
    );
  end loop;
end $$;
