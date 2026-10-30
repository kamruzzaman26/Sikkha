-- Admin user RPCs aligned with the existing public.profiles and public.user_roles schema.
-- Customer suspension is intentionally unavailable until a real status column/table is designed.

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  phone text,
  account_status text,
  access_role text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(p.display_name, ''),
    ''::text,
    'active'::text,
    coalesce(r.role::text, 'customer')
  from auth.users as u
  left join public.profiles as p on p.id = u.id
  left join lateral (
    select ur.role
    from public.user_roles as ur
    where ur.user_id = u.id
    order by ur.created_at desc
    limit 1
  ) as r on true
  order by u.created_at desc
  limit 500;
end;
$$;

create or replace function public.admin_set_customer_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  raise exception
    'Customer suspension is unavailable: the current profiles schema has no account_status field.'
    using errcode = '0A000';
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_customer_status(uuid, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_customer_status(uuid, text) to authenticated;
