-- Customer phone details and account status are sourced from customer_profiles.
-- Admin role checks continue to use user_roles; admin_users remains a synchronized
-- compatibility table for existing RLS policies.

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_profiles as existing_profile (
    user_id,
    display_name,
    phone
  )
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100),
    left(coalesce(new.phone, ''), 25)
  )
  on conflict (user_id) do update
    set phone = case
      when existing_profile.phone = '' then excluded.phone
      else existing_profile.phone
    end,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.create_customer_profile()
  from public, anon, authenticated;

-- Keep customer contact and account-status data in sync for every new Auth user.
-- The existing handle_new_user trigger continues to create profiles and roles.
drop trigger if exists on_auth_customer_profile_created on auth.users;
create trigger on_auth_customer_profile_created
after insert on auth.users
for each row execute function public.create_customer_profile();

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
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required.'
      using errcode = '42501';
  end if;

  return query
  select
    u.id,
    coalesce(u.email::text, ''),
    coalesce(nullif(p.display_name, ''), cp.display_name, ''),
    coalesce(nullif(cp.phone, ''), u.phone, ''),
    coalesce(cp.account_status, 'active'),
    coalesce(r.role::text, 'customer')
  from auth.users as u
  left join public.customer_profiles as cp on cp.user_id = u.id
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

revoke all on function public.admin_list_users()
  from public, anon;
grant execute on function public.admin_list_users()
  to authenticated;

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
    raise exception 'Administrator access required.'
      using errcode = '42501';
  end if;

  if p_user_id is null or p_status is null
    or p_status not in ('active', 'suspended')
  then
    raise exception 'Invalid customer account status.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1 from auth.users as u where u.id = p_user_id
  ) then
    raise exception 'Customer account not found.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.user_roles as ur
    where ur.user_id = p_user_id
      and ur.role = 'admin'
  ) then
    raise exception 'Administrator accounts cannot be suspended here.'
      using errcode = '42501';
  end if;

  insert into public.customer_profiles (
    user_id,
    display_name,
    phone,
    account_status
  )
  select
    u.id,
    coalesce(nullif(cp.display_name, ''), p.display_name, ''),
    coalesce(nullif(cp.phone, ''), u.phone, ''),
    p_status
  from auth.users as u
  left join public.customer_profiles as cp on cp.user_id = u.id
  left join public.profiles as p on p.id = u.id
  where u.id = p_user_id
  on conflict (user_id) do update
    set account_status = excluded.account_status,
        updated_at = now();
end;
$$;

revoke all on function public.admin_set_customer_status(uuid, text)
  from public, anon;
grant execute on function public.admin_set_customer_status(uuid, text)
  to authenticated;
