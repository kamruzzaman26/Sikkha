create or replace function public.admin_list_users()
returns table(user_id uuid, email text, display_name text, phone text, account_status text, access_role text)
language plpgsql stable security definer set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  return query
  select u.id, coalesce(u.email::text, ''),
    coalesce(nullif(p.display_name, ''), cp.display_name, ''),
    coalesce(nullif(cp.phone, ''), u.phone, ''),
    coalesce(cp.account_status, 'active'),
    coalesce(
      (select sr.staff_role from public.staff_roles sr where sr.user_id = u.id order by sr.created_at desc limit 1),
      (select ur.role::text from public.user_roles ur where ur.user_id = u.id order by ur.created_at desc limit 1),
      'customer'
    )
  from auth.users u
  left join public.customer_profiles cp on cp.user_id = u.id
  left join public.profiles p on p.id = u.id
  order by u.created_at desc limit 500;
end;
$function$;
