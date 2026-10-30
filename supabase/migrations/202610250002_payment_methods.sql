create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  code text not null unique
    check (code ~ '^[a-z0-9]+([_-][a-z0-9]+)*$')
    check (char_length(code) <= 64),
  method_type text not null
    check (method_type in ('manual', 'cod', 'gateway')),
  description text not null default ''
    check (char_length(description) <= 500),
  instructions text not null default ''
    check (char_length(instructions) <= 3000),
  is_enabled boolean not null default false,
  check (method_type <> 'gateway' or not is_enabled),
  sort_order integer not null default 0 check (sort_order between 0 and 99999),
  configuration jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_methods_public_order_idx
  on public.payment_methods (sort_order, name)
  where is_enabled and method_type <> 'gateway';

alter table public.payment_methods enable row level security;

revoke all on public.payment_methods from public, anon, authenticated;
grant select (
  id,
  name,
  code,
  method_type,
  description,
  instructions,
  is_enabled,
  sort_order,
  created_at,
  updated_at
) on public.payment_methods to anon, authenticated;
grant insert (
  name,
  code,
  method_type,
  description,
  instructions,
  is_enabled,
  sort_order
) on public.payment_methods to authenticated;
grant update (
  name,
  code,
  method_type,
  description,
  instructions,
  is_enabled,
  sort_order,
  updated_at
) on public.payment_methods to authenticated;

drop policy if exists "Public can read enabled payment methods"
  on public.payment_methods;
create policy "Public can read enabled payment methods"
  on public.payment_methods
  for select
  to anon, authenticated
  using (is_enabled and method_type <> 'gateway');

drop policy if exists "Admins can manage payment methods"
  on public.payment_methods;
create policy "Admins can manage payment methods"
  on public.payment_methods
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
