create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(12, 2) not null default 0,
  product_type text not null default 'book',
  category text,
  author text,
  publisher text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists product_type text not null default 'book',
  add column if not exists category text,
  add column if not exists author text,
  add column if not exists publisher text,
  add column if not exists is_published boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_product_type_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_product_type_check
      check (product_type in ('book', 'course'));
  end if;
end;
$$;

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  partner text,
  url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_links_partner_check
    check (partner is null or partner in ('rokomari', '10_minute_school'))
);

alter table public.affiliate_links
  add column if not exists partner text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'affiliate_links_partner_check'
      and conrelid = 'public.affiliate_links'::regclass
  ) then
    alter table public.affiliate_links
      add constraint affiliate_links_partner_check
      check (partner is null or partner in ('rokomari', '10_minute_school'));
  end if;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists role text not null default 'admin';

create table if not exists public.affiliate_partner_domains (
  partner text not null
    check (partner in ('rokomari', '10_minute_school')),
  hostname text not null
    check (char_length(hostname) <= 253)
    check (hostname = lower(hostname))
    check (hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'),
  primary key (partner, hostname)
);

create table if not exists public.affiliate_partner_destinations (
  partner text not null
    check (partner in ('rokomari', '10_minute_school')),
  hostname text not null
    check (char_length(hostname) <= 253)
    check (hostname = lower(hostname))
    check (hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'),
  primary key (partner, hostname)
);

insert into public.affiliate_partner_domains (partner, hostname)
values
  ('rokomari', 'rkmri.co'),
  ('10_minute_school', '10ms.io')
on conflict (partner, hostname) do nothing;

insert into public.affiliate_partner_destinations (partner, hostname)
values
  ('rokomari', 'www.rokomari.com'),
  ('10_minute_school', '10minuteschool.com')
on conflict (partner, hostname) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_role_check'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_role_check
      check (role in ('admin', 'editor'));
  end if;
end;
$$;

create unique index if not exists products_slug_unique_idx
  on public.products (slug);
create index if not exists products_published_type_title_idx
  on public.products (product_type, is_published, title);
create index if not exists affiliate_links_product_active_idx
  on public.affiliate_links (product_id, is_active);

alter table public.admin_users enable row level security;
alter table public.affiliate_partner_domains enable row level security;
alter table public.affiliate_partner_destinations enable row level security;
alter table public.products enable row level security;
alter table public.affiliate_links enable row level security;

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
revoke all on public.affiliate_partner_domains from anon, authenticated;
grant select on public.affiliate_partner_domains to anon, authenticated;
revoke all on public.affiliate_partner_destinations from anon, authenticated;
grant select on public.affiliate_partner_destinations to anon, authenticated;

revoke all on public.products from anon, authenticated;
grant select (id, title, slug, description, price, product_type, category, author, publisher, is_published)
  on public.products to anon;
grant select, insert, update on public.products to authenticated;

revoke all on public.affiliate_links from anon, authenticated;
grant select on public.affiliate_links to anon, authenticated;
grant insert, update, delete on public.affiliate_links to authenticated;

drop policy if exists "Admins can read their own admin membership"
  on public.admin_users;
create policy "Admins can read their own admin membership"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Restrict admin membership visibility"
  on public.admin_users;
create policy "Restrict admin membership visibility"
  on public.admin_users
  as restrictive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Public can read approved affiliate partner domains"
  on public.affiliate_partner_domains;
create policy "Public can read approved affiliate partner domains"
  on public.affiliate_partner_domains
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read approved affiliate partner destinations"
  on public.affiliate_partner_destinations;
create policy "Public can read approved affiliate partner destinations"
  on public.affiliate_partner_destinations
  for select
  to anon, authenticated
  using (true);

create or replace function public.enforce_affiliate_partner_domain()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  requested_hostname text;
begin
  if not new.is_active then
    return new;
  end if;

  if lower(new.url) !~ '^https://[^/@:?#]+(/|[?#]|$)' then
    raise exception 'Affiliate URL must use HTTPS without credentials or a custom port.'
      using errcode = '23514';
  end if;

  requested_hostname := lower(substring(lower(new.url) from '^https://([^/:?#]+)'));

  if new.partner is null or requested_hostname is null or not exists (
    select 1
    from public.affiliate_partner_domains
    where partner = new.partner
      and hostname = requested_hostname
  ) then
    raise exception 'Affiliate URL hostname is not approved for this partner.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_affiliate_partner_domain
  on public.affiliate_links;
create trigger enforce_affiliate_partner_domain
  before insert or update
  on public.affiliate_links
  for each row
  execute function public.enforce_affiliate_partner_domain();

drop policy if exists "Public can read active affiliate links"
  on public.affiliate_links;
create policy "Public can read active affiliate links"
  on public.affiliate_links
  for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1
      from public.products
      where id = affiliate_links.product_id
        and is_published
    )
    and exists (
      select 1
      from public.affiliate_partner_domains
      where partner = affiliate_links.partner
        and hostname = lower(substring(lower(affiliate_links.url) from '^https://([^/:?#]+)'))
    )
  );

drop policy if exists "Admins can manage affiliate links"
  on public.affiliate_links;
create policy "Admins can manage affiliate links"
  on public.affiliate_links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    )
  );

drop policy if exists "Restrict affiliate links to active public rows or admins"
  on public.affiliate_links;
create policy "Restrict affiliate links to active public rows or admins"
  on public.affiliate_links
  as restrictive
  for all
  to anon, authenticated
  using (
    (
      is_active
      and exists (
        select 1
        from public.products
        where id = affiliate_links.product_id
          and is_published
      )
      and exists (
        select 1
        from public.affiliate_partner_domains
        where partner = affiliate_links.partner
          and hostname = lower(substring(lower(affiliate_links.url) from '^https://([^/:?#]+)'))
      )
    )
    or exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    )
  )
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    )
  );

drop policy if exists "Public can resolve products with active affiliate links"
  on public.products;
create policy "Public can resolve products with active affiliate links"
  on public.products
  for select
  to anon, authenticated
  using (is_published);

drop policy if exists "Admins can read products"
  on public.products;
create policy "Admins can read products"
  on public.products
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can create products"
  on public.products;
create policy "Admins can create products"
  on public.products
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role = 'admin'
    )
  );

drop policy if exists "Admins can update products"
  on public.products;
create policy "Admins can update products"
  on public.products
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role = 'admin'
    )
  );

drop policy if exists "Restrict products to published rows or admins"
  on public.products;
create policy "Restrict products to published rows or admins"
  on public.products
  as restrictive
  for all
  to anon, authenticated
  using (
    is_published
    or exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role in ('admin', 'editor')
    )
  )
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
        and role = 'admin'
    )
  );
