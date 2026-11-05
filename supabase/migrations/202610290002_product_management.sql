create table if not exists public.product_types (
  slug text primary key
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    check (char_length(slug) <= 80),
  label text not null
    check (char_length(btrim(label)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.product_types (slug, label)
values
  ('book', 'বই'),
  ('course', 'কোর্স'),
  ('islamic-accessory', 'ইসলামিক উপকরণ'),
  ('arabic-resource', 'আরবি শেখার উপকরণ'),
  ('stationery', 'স্টেশনারি ও পড়াশোনার সামগ্রী'),
  ('other', 'অন্যান্য')
on conflict (slug) do nothing;

alter table public.products
  drop constraint if exists products_product_type_check,
  alter column price drop not null,
  add column if not exists image_url text,
  add column if not exists commerce_mode text,
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_product_type_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_product_type_fkey
      foreign key (product_type)
      references public.product_types (slug)
      on update cascade
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_commerce_mode_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_commerce_mode_check
      check (commerce_mode is null or commerce_mode in ('affiliate', 'direct'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_direct_sale_price_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_direct_sale_price_check
      check (
        commerce_mode is distinct from 'direct'
        or (price is not null and price >= 0)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_image_url_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_image_url_check
      check (
        image_url is null
        or (
          char_length(image_url) between 1 and 2048
          and image_url = btrim(image_url)
          and lower(image_url) ~ '^https://[^/@:?#]+([/?#][^[:space:]]*)?$'
        )
      );
  end if;
end;
$$;

create index if not exists products_public_catalog_idx
  on public.products (product_type, title)
  where is_published and archived_at is null and commerce_mode is not null;

alter table public.product_types enable row level security;

revoke all on public.product_types from anon, authenticated;
grant select on public.product_types to anon, authenticated;
grant insert, update on public.product_types to authenticated;

drop policy if exists "Public can read active product types"
  on public.product_types;
create policy "Public can read active product types"
  on public.product_types
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Admins can read all product types"
  on public.product_types;
create policy "Admins can read all product types"
  on public.product_types
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

drop policy if exists "Admins can manage product types"
  on public.product_types;
create policy "Admins can manage product types"
  on public.product_types
  for all
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

grant select (image_url, commerce_mode, archived_at, created_at)
  on public.products to anon;

drop policy if exists "Public can resolve products with active affiliate links"
  on public.products;
create policy "Public can resolve products with active affiliate links"
  on public.products
  for select
  to anon, authenticated
  using (
    is_published
    and archived_at is null
    and commerce_mode is not null
  );

drop policy if exists "Restrict products to published rows or admins"
  on public.products;
create policy "Restrict products to published rows or admins"
  on public.products
  as restrictive
  for all
  to anon, authenticated
  using (
    (
      is_published
      and archived_at is null
      and commerce_mode is not null
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
        and role = 'admin'
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
          and archived_at is null
          and commerce_mode = 'affiliate'
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

create or replace function public.enforce_affiliate_product_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_active and not exists (
    select 1
    from public.products
    where id = new.product_id
      and commerce_mode = 'affiliate'
      and archived_at is null
  ) then
    raise exception 'Active affiliate links require an unarchived affiliate product.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_affiliate_product_mode
  on public.affiliate_links;
create trigger enforce_affiliate_product_mode
  before insert or update of product_id, is_active
  on public.affiliate_links
  for each row
  execute function public.enforce_affiliate_product_mode();

create or replace function public.prevent_direct_mode_with_active_affiliate_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.commerce_mode is distinct from old.commerce_mode
    and new.commerce_mode is distinct from 'affiliate'
    and exists (
      select 1
      from public.affiliate_links
      where product_id = new.id
        and is_active
    )
  then
    raise exception 'Deactivate affiliate links before changing this product to direct sale.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_direct_mode_with_active_affiliate_links
  on public.products;
create trigger prevent_direct_mode_with_active_affiliate_links
  before update of commerce_mode
  on public.products
  for each row
  execute function public.prevent_direct_mode_with_active_affiliate_links();

create or replace function public.enforce_direct_product_order_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.products
    where id = new.product_id
      and is_published
      and archived_at is null
      and commerce_mode = 'direct'
  ) then
    raise exception 'Only published, unarchived direct-sale products can be ordered.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_direct_product_order_items()
  from public, anon, authenticated;
drop trigger if exists enforce_direct_product_order_items
  on public.order_items;
create trigger enforce_direct_product_order_items
  before insert or update of product_id
  on public.order_items
  for each row
  execute function public.enforce_direct_product_order_items();

create or replace function public.admin_import_affiliate_books(
  p_rows jsonb,
  p_commit boolean
)
returns table (
  row_number integer,
  status text,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_value jsonb;
  current_row_number integer;
  row_number_value text;
  book_name_value text;
  slug_value text;
  affiliate_url_value text;
  image_url_value text;
  affiliate_hostname text;
  image_hostname text;
  affiliate_partner text;
  matching_partners integer;
  inserted_product_id uuid;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and role = 'admin'
  ) then
    raise exception 'Administrator permission required.'
      using errcode = '42501';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Import must contain no more than 500 rows.'
      using errcode = '22023';
  end if;
  if p_commit is null then
    raise exception 'Import mode must be specified.'
      using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'Import must contain no more than 500 rows.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(1947280432, 934156);

  for row_value in
    select value
    from jsonb_array_elements(p_rows)
  loop
    row_number_value := row_value ->> 'row_number';
    if coalesce(row_number_value, '') !~ '^[1-9][0-9]{0,5}$' then
      raise exception 'Invalid CSV row number.'
        using errcode = '22023';
    end if;
    current_row_number := row_number_value::integer;
    row_number := current_row_number;
    status := 'invalid';
    reason := null;

    book_name_value := row_value ->> 'book_name';
    slug_value := row_value ->> 'slug';
    affiliate_url_value := row_value ->> 'affiliate_url';
    image_url_value := row_value ->> 'image_url';

    if book_name_value is null
      or char_length(btrim(book_name_value)) not between 1 and 200
      or book_name_value ~ '[[:cntrl:]]'
    then
      reason := 'invalid_name';
      return next;
      continue;
    end if;

    if slug_value is null
      or char_length(slug_value) > 160
      or slug_value !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    then
      reason := 'duplicate_slug';
      return next;
      continue;
    end if;

    if affiliate_url_value is null
      or char_length(affiliate_url_value) not between 1 and 2048
      or affiliate_url_value ~ '[[:space:]]'
      or lower(affiliate_url_value) !~ '^https://[^/@:?#]+([/?#][^[:space:]]*)?$'
    then
      reason := 'invalid_url';
      return next;
      continue;
    end if;

    affiliate_hostname := lower(
      substring(affiliate_url_value from '^https://([^/:?#]+)')
    );
    select count(*), min(partner)
      into matching_partners, affiliate_partner
    from public.affiliate_partner_domains
    where hostname = affiliate_hostname
      and partner in ('rokomari', '10_minute_school');
    if matching_partners = 0 then
      reason := 'partner_not_approved';
      return next;
      continue;
    elsif matching_partners > 1 then
      reason := 'partner_not_approved';
      return next;
      continue;
    end if;
    if image_url_value is null
      or char_length(image_url_value) not between 1 and 2048
      or image_url_value <> btrim(image_url_value)
      or image_url_value ~ '[[:space:]]'
      or lower(image_url_value) !~ '^https://[^/@:?#]+([/?#][^[:space:]]*)?$'
    then
      reason := 'invalid_image_url';
      return next;
      continue;
    end if;
    image_hostname := lower(
      substring(image_url_value from '^https://([^/:?#]+)')
    );
    if image_hostname is null
      or image_hostname !~ '\.'
      or image_hostname ~ '^[0-9.]+$'
      or image_hostname ~* '(^|\.)localhost$'
      or image_hostname ~* '(^|\.)local$'
    then
      reason := 'invalid_image_url';
      return next;
      continue;
    end if;

    if exists (
      select 1
      from public.products
      where product_type = 'book'
        and lower(btrim(title)) = lower(btrim(book_name_value))
    ) then
      status := 'duplicate';
      reason := 'duplicate_name';
      return next;
      continue;
    end if;

    if exists (
      select 1
      from public.affiliate_links
      where url = affiliate_url_value
    ) then
      status := 'duplicate';
      reason := 'duplicate_url';
      return next;
      continue;
    end if;

    if exists (
      select 1
      from public.products
      where slug = slug_value
    ) then
      status := 'duplicate';
      reason := 'duplicate_slug';
      return next;
      continue;
    end if;

    if not p_commit then
      status := 'ready';
      return next;
      continue;
    end if;

    begin
      insert into public.products (
        title,
        slug,
        description,
        price,
        product_type,
        image_url,
        commerce_mode,
        is_published
      )
      values (
        book_name_value,
        slug_value,
        '',
        null,
        'book',
        image_url_value,
        'affiliate',
        false
      )
      returning id into inserted_product_id;

      insert into public.affiliate_links (
        product_id,
        partner,
        url,
        is_active
      )
      values (
        inserted_product_id,
        affiliate_partner,
        affiliate_url_value,
        true
      );

      status := 'imported';
      reason := null;
      return next;
    exception
      when unique_violation then
        status := 'duplicate';
        reason := 'duplicate_slug';
        return next;
      when check_violation or foreign_key_violation or not_null_violation then
        status := 'failed';
        reason := 'database_constraint';
        return next;
    end;
  end loop;
end;
$$;

revoke all on function public.admin_import_affiliate_books(jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_import_affiliate_books(jsonb, boolean)
  to authenticated;
