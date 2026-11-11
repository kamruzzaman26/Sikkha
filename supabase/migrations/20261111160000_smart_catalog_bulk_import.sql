-- Smart Catalog Bulk Import: normalized product metadata, relations and editorial bestseller list.
-- All imported products remain unpublished drafts. Existing records are never overwritten.

create or replace function public.admin_import_catalog_products(
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
  current_row integer;
  v_name text;
  v_slug text;
  v_description text;
  v_product_type text;
  v_sales_type text;
  v_affiliate_url text;
  v_image_url text;
  v_partner text;
  v_host text;
  v_image_host text;
  v_matching_partners integer;
  v_price numeric;
  v_cost numeric;
  v_list_price numeric;
  v_page_count integer;
  v_weight numeric;
  v_isbn text;
  v_edition text;
  v_language text;
  v_country text;
  v_category_group text;
  v_category_path text;
  v_primary_category text;
  v_category_id uuid;
  v_primary_category_id uuid;
  v_product_id uuid;
  v_entity_name text;
  v_entity_id uuid;
  v_primary_name text;
  v_entity_kind text;
  v_relation_table text;
  v_fk_column text;
  v_list_id uuid;
  v_bestseller boolean;
  v_authors text[];
  v_publishers text[];
  v_brands text[];
  v_instructors text[];
  v_categories text[];
  v_entity_names text[];
  v_index integer;
  v_first_author text;
  v_first_publisher text;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Administrator permission required.' using errcode = '42501';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) is distinct from 'array'
     or jsonb_array_length(p_rows) > 500 or p_commit is null then
    raise exception 'Import must contain 1 to 500 rows and a valid mode.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(1947280432, 934156);

  for row_value in select value from jsonb_array_elements(p_rows)
  loop
    current_row := nullif(row_value->>'row_number','')::integer;
    row_number := current_row;
    status := 'invalid';
    reason := null;

    v_name := row_value->>'product_name';
    v_slug := row_value->>'slug';
    v_description := coalesce(row_value->>'description','');
    v_product_type := coalesce(nullif(row_value->>'product_type',''),'book');
    v_sales_type := coalesce(nullif(row_value->>'sales_type',''),'affiliate');
    v_affiliate_url := nullif(row_value->>'affiliate_url','');
    v_image_url := nullif(row_value->>'image_url','');
    v_isbn := nullif(row_value->>'isbn','');
    v_edition := nullif(row_value->>'edition','');
    v_language := nullif(row_value->>'language','');
    v_country := nullif(row_value->>'country','');
    v_primary_category := nullif(row_value->>'primary_category','');
    v_bestseller := coalesce((row_value->>'bestseller')::boolean,false);
    v_authors := array(select jsonb_array_elements_text(coalesce(row_value->'authors','[]'::jsonb)));
    v_publishers := array(select jsonb_array_elements_text(coalesce(row_value->'publishers','[]'::jsonb)));
    v_brands := array(select jsonb_array_elements_text(coalesce(row_value->'brands','[]'::jsonb)));
    v_instructors := array(select jsonb_array_elements_text(coalesce(row_value->'instructors','[]'::jsonb)));
    v_categories := array(select jsonb_array_elements_text(coalesce(row_value->'categories','[]'::jsonb)));

    if v_name is null or char_length(btrim(v_name)) not between 1 and 200
       or v_name ~ '[[:cntrl:]]' then
      reason := 'invalid_name'; return next; continue;
    end if;
    if v_slug is null or char_length(v_slug) > 160
       or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      reason := 'invalid_slug'; return next; continue;
    end if;
    if v_description is not null and char_length(v_description) > 5000 then
      reason := 'invalid_description'; return next; continue;
    end if;
    if v_sales_type not in ('affiliate','direct') then
      reason := 'invalid_sales_type'; return next; continue;
    end if;
    if not exists (select 1 from public.product_types where slug=v_product_type and is_active) then
      reason := 'invalid_product_type'; return next; continue;
    end if;

    v_price := nullif(row_value->>'selling_price','')::numeric;
    v_cost := nullif(row_value->>'cost_price','')::numeric;
    v_list_price := nullif(row_value->>'list_price','')::numeric;
    v_page_count := nullif(row_value->>'page_count','')::integer;
    v_weight := nullif(row_value->>'weight_kg','')::numeric;

    if v_price is not null and (v_price < 0 or v_price > 9999999999.99) then
      reason := 'invalid_price'; return next; continue;
    end if;
    if v_sales_type='direct' and v_price is null then
      reason := 'direct_price_required'; return next; continue;
    end if;
    if v_cost is not null and v_cost < 0 then
      reason := 'invalid_cost_price'; return next; continue;
    end if;
    if v_list_price is not null and (v_price is null or v_list_price < v_price) then
      reason := 'invalid_list_price'; return next; continue;
    end if;
    if v_page_count is not null and v_page_count < 1 then
      reason := 'invalid_page_count'; return next; continue;
    end if;
    if v_weight is not null and v_weight <= 0 then
      reason := 'invalid_weight'; return next; continue;
    end if;

    if v_image_url is not null then
      if char_length(v_image_url) > 2048 or v_image_url <> btrim(v_image_url)
         or v_image_url ~ '[[:space:]]'
         or lower(v_image_url) !~ '^https://[^/@:?#]+([/?#][^[:space:]]*)?$' then
        reason := 'invalid_image_url'; return next; continue;
      end if;
      v_image_host := lower(substring(v_image_url from '^https://([^/:?#]+)'));
      if v_image_host !~ '\.' or v_image_host ~ '^[0-9.]+$'
         or v_image_host ~* '(^|\.)localhost$' or v_image_host ~* '(^|\.)local$' then
        reason := 'invalid_image_url'; return next; continue;
      end if;
    end if;

    v_partner := null;
    if v_sales_type='affiliate' then
      if v_affiliate_url is null or char_length(v_affiliate_url) > 2048
         or v_affiliate_url ~ '[[:space:]]'
         or lower(v_affiliate_url) !~ '^https://[^/@:?#]+([/?#][^[:space:]]*)?$' then
        reason := 'invalid_url'; return next; continue;
      end if;
      v_host := lower(substring(v_affiliate_url from '^https://([^/:?#]+)'));
      select count(*), min(partner) into v_matching_partners, v_partner
      from public.affiliate_partner_domains
      where hostname=v_host and partner in ('rokomari','10_minute_school');
      if v_matching_partners <> 1 then
        reason := 'partner_not_approved'; return next; continue;
      end if;
    elsif v_affiliate_url is not null then
      reason := 'direct_product_must_not_have_affiliate_url'; return next; continue;
    end if;

    v_category_group := case
      when v_product_type='book' then 'books'
      when v_product_type='course' then 'courses'
      when v_product_type='electronics' then 'electronics'
      else 'products'
    end;
    v_primary_category_id := null;
    for v_category_path in select unnest(v_categories)
    loop
      with recursive tree as (
        select c.id,c.parent_id,c.name,c.category_group,array[c.name] as path
        from public.categories c
        where c.parent_id is null and c.is_active
        union all
        select c.id,c.parent_id,c.name,c.category_group,t.path || c.name
        from public.categories c join tree t on c.parent_id=t.id
        where c.is_active and c.category_group=t.category_group
      )
      select id into v_category_id from tree
      where category_group=v_category_group
        and array_to_string(path,' › ')=v_category_path
      limit 1;
      if v_category_id is null then
        reason := 'category_not_found'; exit;
      end if;
      if v_primary_category_id is null or v_category_path=v_primary_category then
        v_primary_category_id := v_category_id;
      end if;
      v_category_id := null;
    end loop;
    if reason is not null then return next; continue; end if;
    if cardinality(v_categories)>0 and v_primary_category is not null
       and not (v_primary_category = any(v_categories)) then
      reason := 'primary_category_not_selected'; return next; continue;
    end if;

    if exists(select 1 from public.products where lower(btrim(title))=lower(btrim(v_name))) then
      status := 'duplicate'; reason := 'duplicate_name'; return next; continue;
    end if;
    if exists(select 1 from public.products where slug=v_slug) then
      status := 'duplicate'; reason := 'duplicate_slug'; return next; continue;
    end if;
    if v_affiliate_url is not null and exists(
      select 1 from public.affiliate_links where url=v_affiliate_url and deleted_at is null
    ) then
      status := 'duplicate'; reason := 'duplicate_url'; return next; continue;
    end if;

    if not p_commit then
      status := 'ready'; return next; continue;
    end if;

    begin
      v_first_author := nullif(v_authors[1],'');
      v_first_publisher := nullif(v_publishers[1],'');

      insert into public.products(
        title,slug,description,product_type,price,list_price,image_url,
        commerce_mode,is_published,status,author,publisher,category,
        isbn,edition,page_count,language,country,weight_kg,cost_price
      ) values (
        v_name,v_slug,v_description,v_product_type,v_price,v_list_price,v_image_url,
        v_sales_type,false,'draft'::public.content_status,v_first_author,v_first_publisher,
        nullif(v_categories[1],''),v_isbn,v_edition,v_page_count,v_language,v_country,v_weight,v_cost
      ) returning id into v_product_id;

      if v_sales_type='affiliate' then
        insert into public.affiliate_links(product_id,partner,url,is_active)
        values(v_product_id,v_partner,v_affiliate_url,true);
      end if;

      foreach v_entity_kind in array array['authors','publishers','brands','creators']
      loop
        v_entity_names := case v_entity_kind
          when 'authors' then v_authors
          when 'publishers' then v_publishers
          when 'brands' then v_brands
          else v_instructors
        end;
        v_index := 0;
        foreach v_entity_name in array v_entity_names
        loop
          v_entity_name := btrim(v_entity_name);
          if v_entity_name='' then continue; end if;
          v_index := v_index+1;
          if v_entity_kind='authors' then
            select id into v_entity_id from public.authors where lower(btrim(name))=lower(v_entity_name) limit 1;
            if v_entity_id is null then
              insert into public.authors(name,slug) values(v_entity_name,'author-'||substr(md5(lower(v_entity_name)),1,24))
              on conflict(slug) do nothing;
              select id into v_entity_id from public.authors where lower(btrim(name))=lower(v_entity_name) limit 1;
            end if;
            insert into public.product_authors(product_id,author_id,is_primary)
            values(v_product_id,v_entity_id,v_index=1) on conflict do nothing;
          elsif v_entity_kind='publishers' then
            select id into v_entity_id from public.publishers where lower(btrim(name))=lower(v_entity_name) limit 1;
            if v_entity_id is null then
              insert into public.publishers(name,slug) values(v_entity_name,'publisher-'||substr(md5(lower(v_entity_name)),1,24))
              on conflict(slug) do nothing;
              select id into v_entity_id from public.publishers where lower(btrim(name))=lower(v_entity_name) limit 1;
            end if;
            insert into public.product_publishers(product_id,publisher_id,is_primary)
            values(v_product_id,v_entity_id,v_index=1) on conflict do nothing;
          elsif v_entity_kind='brands' then
            select id into v_entity_id from public.brands where lower(btrim(name))=lower(v_entity_name) limit 1;
            if v_entity_id is null then
              insert into public.brands(name,slug) values(v_entity_name,'brand-'||substr(md5(lower(v_entity_name)),1,24))
              on conflict(slug) do nothing;
              select id into v_entity_id from public.brands where lower(btrim(name))=lower(v_entity_name) limit 1;
            end if;
            insert into public.product_brands(product_id,brand_id,is_primary)
            values(v_product_id,v_entity_id,v_index=1) on conflict do nothing;
          else
            select id into v_entity_id from public.creators where lower(btrim(name))=lower(v_entity_name) limit 1;
            if v_entity_id is null then
              insert into public.creators(name,slug,creator_type)
              values(v_entity_name,'creator-'||substr(md5(lower(v_entity_name)),1,24),'instructor')
              on conflict(slug) do nothing;
              select id into v_entity_id from public.creators where lower(btrim(name))=lower(v_entity_name) limit 1;
            end if;
            insert into public.product_creators(product_id,creator_id,is_primary)
            values(v_product_id,v_entity_id,v_index=1) on conflict do nothing;
          end if;
          v_entity_id := null;
        end loop;
      end loop;

      for v_category_path in select unnest(v_categories)
      loop
        with recursive tree as (
          select c.id,c.parent_id,c.name,c.category_group,array[c.name] as path
          from public.categories c where c.parent_id is null and c.is_active
          union all
          select c.id,c.parent_id,c.name,c.category_group,t.path || c.name
          from public.categories c join tree t on c.parent_id=t.id
          where c.is_active and c.category_group=t.category_group
        )
        select id into v_category_id from tree
        where category_group=v_category_group and array_to_string(path,' › ')=v_category_path
        limit 1;
        insert into public.product_categories(product_id,category_id,is_primary)
        values(v_product_id,v_category_id,(v_category_path=coalesce(v_primary_category,v_categories[1])))
        on conflict(product_id,category_id) do update set is_primary=excluded.is_primary;
        v_category_id := null;
      end loop;

      if v_bestseller then
        insert into public.curated_lists(title,slug,description,status,show_on_homepage)
        values('Bestsellers','bestsellers','Admin-curated bestseller products imported from catalog CSV.','draft',false)
        on conflict(slug) do nothing;
        select id into v_list_id from public.curated_lists where slug='bestsellers';
        insert into public.curated_list_products(list_id,product_id,position)
        values(v_list_id,v_product_id,0) on conflict(list_id,product_id) do nothing;
      end if;

      status := 'imported'; reason := null; return next;
    exception
      when unique_violation then
        status := 'duplicate'; reason := 'duplicate_slug'; return next;
      when check_violation or foreign_key_violation or not_null_violation or invalid_text_representation then
        status := 'failed'; reason := 'database_constraint'; return next;
    end;
  end loop;
end;
$$;

revoke all on function public.admin_import_catalog_products(jsonb,boolean)
  from public, anon, authenticated;
grant execute on function public.admin_import_catalog_products(jsonb,boolean)
  to authenticated;
