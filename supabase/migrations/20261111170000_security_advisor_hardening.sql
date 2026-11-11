-- Security hardening for exposed SECURITY DEFINER RPCs and public stock view.
-- Keep privileged implementations in a non-exposed schema and expose only
-- SECURITY INVOKER wrappers with the original argument and return contracts.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

do $$
declare
  fn record;
  call_args text;
  body_sql text;
  volatility text;
begin
  for fn in
    select p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as identity_args,
           pg_get_function_arguments(p.oid) as all_args,
           pg_get_function_result(p.oid) as result_type,
           p.pronargs,
           p.provolatile
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname in (
        'admin_import_affiliate_books',
        'admin_import_catalog_products',
        'admin_list_users',
        'admin_record_order_refund',
        'admin_review_affiliate',
        'admin_set_customer_status',
        'admin_set_staff_role',
        'admin_update_order_status',
        'best_selling_product_ids',
        'create_sslcommerz_transaction',
        'get_my_affiliate_stats',
        'get_public_coupons',
        'has_permission',
        'is_admin',
        'log_admin_activity',
        'place_order',
        'place_order_with_coupon',
        'place_order_with_referral',
        'preview_coupon',
        'review_order_payment',
        'submit_manual_payment',
        'update_sslcommerz_session'
      )
    order by p.proname, pg_get_function_identity_arguments(p.oid)
  loop
    select coalesce(string_agg('$' || g.n::text, ', ' order by g.n), '')
      into call_args
    from generate_series(1, fn.pronargs) as g(n);

    execute format(
      'alter function public.%I(%s) set schema private',
      fn.proname,
      fn.identity_args
    );

    execute format(
      'revoke all on function private.%I(%s) from public, anon, authenticated',
      fn.proname,
      fn.identity_args
    );

    if fn.proname = 'best_selling_product_ids' then
      -- Only trusted server-side catalog code may read verified sales totals.
      execute format(
        'grant execute on function private.%I(%s) to service_role',
        fn.proname,
        fn.identity_args
      );
      execute format(
        'alter function private.%I(%s) set search_path = %L',
        fn.proname,
        fn.identity_args,
        ''
      );
    else
      execute format(
        'grant execute on function private.%I(%s) to authenticated',
        fn.proname,
        fn.identity_args
      );
    end if;

    volatility := case fn.provolatile
      when 'i' then 'immutable'
      when 's' then 'stable'
      else 'volatile'
    end;

    if left(fn.result_type, 6) = 'TABLE(' then
      body_sql := format(
        'select * from private.%I(%s)',
        fn.proname,
        call_args
      );
    else
      body_sql := format(
        'select private.%I(%s)',
        fn.proname,
        call_args
      );
    end if;

    execute format(
      'create function public.%I(%s) returns %s language sql %s security invoker set search_path = %L as %L',
      fn.proname,
      fn.all_args,
      fn.result_type,
      volatility,
      '',
      body_sql
    );

    execute format(
      'revoke all on function public.%I(%s) from public, anon, authenticated',
      fn.proname,
      fn.identity_args
    );

    if fn.proname = 'best_selling_product_ids' then
      execute format(
        'grant execute on function public.%I(%s) to service_role',
        fn.proname,
        fn.identity_args
      );
    else
      execute format(
        'grant execute on function public.%I(%s) to authenticated',
        fn.proname,
        fn.identity_args
      );
    end if;

    if fn.proname = 'get_public_coupons' then
      execute format(
        'grant execute on function private.%I(%s) to anon',
        fn.proname,
        fn.identity_args
      );
      execute format(
        'grant execute on function public.%I(%s) to anon',
        fn.proname,
        fn.identity_args
      );
    end if;
  end loop;
end
$$;

-- The stock view returns only product_id and an in-stock flag. Make it obey
-- the caller's RLS context instead of the view owner's privileges.
create or replace view public.public_product_stock
with (security_invoker = true)
as
select
  pi.product_id,
  pi.stock_quantity > 0 as in_stock,
  least(pi.stock_quantity, 50) as available_copies
from public.product_inventory pi
join public.products p on p.id = pi.product_id
where p.status = 'published'::public.content_status
  and p.is_published = true
  and p.archived_at is null
  and p.commerce_mode = 'direct';

-- Public catalog reads use the anonymous server client. Remove its broad
-- column grants and expose only the two columns used by the stock view.
do $$
declare
  columns_to_revoke text;
begin
  select string_agg(format('%I', a.attname), ', ' order by a.attnum)
    into columns_to_revoke
  from pg_attribute a
  where a.attrelid = 'public.product_inventory'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if columns_to_revoke is not null then
    execute format(
      'revoke all privileges (%s) on table public.product_inventory from anon',
      columns_to_revoke
    );
  end if;
end
$$;

grant select (product_id, stock_quantity)
on table public.product_inventory to anon;

drop policy if exists "Public can read stock for published direct products"
on public.product_inventory;

create policy "Public can read stock for published direct products"
on public.product_inventory
for select
to anon
using (
  exists (
    select 1
    from public.products p
    where p.id = product_inventory.product_id
      and p.status = 'published'::public.content_status
      and p.is_published = true
      and p.archived_at is null
      and p.commerce_mode = 'direct'
  )
);

comment on schema private is
  'Non-exposed schema for privileged implementation functions; call only through reviewed public invoker wrappers.';
