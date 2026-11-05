-- Customer-facing book feedback. Reviews require a verified order and remain hidden until moderation.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(trim(body)) between 10 and 3000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,user_id)
);
create index if not exists product_reviews_public_idx on public.product_reviews(product_id,status,created_at desc);

create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 10 and 1500),
  answer text,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  status text not null default 'pending' check (status in ('pending','answered','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_questions_public_idx on public.product_questions(product_id,status,created_at desc);

alter table public.product_reviews enable row level security;
alter table public.product_questions enable row level security;

drop policy if exists "Public can read approved product reviews" on public.product_reviews;
create policy "Public can read approved product reviews" on public.product_reviews for select using (status = 'approved');
drop policy if exists "Users can submit own product reviews" on public.product_reviews;
create policy "Users can submit own product reviews" on public.product_reviews for insert to authenticated with check (
  auth.uid() = user_id and exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.product_id = product_reviews.product_id and o.user_id = auth.uid()
      and o.status in ('confirmed','processing','shipped','delivered','completed')
  )
);
drop policy if exists "Public can read answered product questions" on public.product_questions;
create policy "Public can read answered product questions" on public.product_questions for select using (status = 'answered' and answer is not null);
drop policy if exists "Users can submit own product questions" on public.product_questions;
create policy "Users can submit own product questions" on public.product_questions for insert to authenticated with check (auth.uid() = user_id);

grant select on public.product_reviews, public.product_questions to anon, authenticated;
grant insert on public.product_reviews, public.product_questions to authenticated;

create or replace function public.get_product_review_summary(p_product_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql stable security invoker set search_path = public
as $$
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)
  from public.product_reviews where product_id = p_product_id and status = 'approved';
$$;
grant execute on function public.get_product_review_summary(uuid) to anon, authenticated;
