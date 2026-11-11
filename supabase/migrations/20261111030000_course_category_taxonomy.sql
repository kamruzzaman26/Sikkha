-- Add a dedicated taxonomy group for courses and seed the official 10 Minute School
-- category families. Free is a price/access attribute, not a category.
alter table public.categories
  drop constraint if exists categories_category_group_check;

alter table public.categories
  add constraint categories_category_group_check
  check (category_group in ('books', 'products', 'electronics', 'courses'));

insert into public.categories (name, slug, category_group, sort_order, source)
values
  ('Class 6-12', 'class-6-12', 'courses', 1, '10minuteschool'),
  ('Skills', 'skills', 'courses', 2, '10minuteschool')
on conflict (category_group, slug) do nothing;

insert into public.categories (name, slug, category_group, sort_order, parent_id, source)
select v.name, v.slug, 'courses', v.sort_order, p.id, '10minuteschool'
from (values
  ('Class 5', 'class-5', 1, 'class-6-12'),
  ('Class 6', 'class-6', 2, 'class-6-12'),
  ('Class 7', 'class-7', 3, 'class-6-12'),
  ('Class 8', 'class-8', 4, 'class-6-12'),
  ('Class 9', 'class-9', 5, 'class-6-12'),
  ('Class 10', 'class-10', 6, 'class-6-12'),
  ('HSC', 'hsc', 7, 'class-6-12'),
  ('Master Book', 'master-book', 8, 'class-6-12'),
  ('Language Learning', 'language-learning', 1, 'skills'),
  ('Freelancing', 'freelancing', 2, 'skills'),
  ('Bundle', 'bundle', 3, 'skills'),
  ('Skills & IT', 'skills-and-it', 4, 'skills'),
  ('Design & Creative', 'design-creative', 5, 'skills'),
  ('Career Readiness', 'career-readiness', 6, 'skills'),
  ('Kids (Age 7-14)', 'kids-age-7-14', 7, 'skills'),
  ('Professional', 'professional', 8, 'skills')
) as v(name, slug, sort_order, parent_slug)
join public.categories p
  on p.category_group = 'courses' and p.slug = v.parent_slug
on conflict (category_group, slug) do nothing;

insert into public.categories (name, slug, category_group, sort_order, parent_id, source)
select v.name, v.slug, 'courses', v.sort_order, p.id, '10minuteschool'
from (values
  ('IELTS', 'ielts', 1, 'language-learning'),
  ('Spoken English', 'spoken-english', 2, 'language-learning'),
  ('Arabic & Quran Learning', 'arabic-quran-learning', 3, 'language-learning'),
  ('Graphic Design', 'graphic-design-freelancing', 1, 'freelancing'),
  ('WordPress', 'wordpress', 2, 'freelancing'),
  ('Programming', 'programming', 1, 'skills-and-it'),
  ('Money Management', 'money-management', 2, 'skills-and-it'),
  ('Computer Skills', 'computer-skills', 3, 'skills-and-it'),
  ('Web Design', 'web-design', 4, 'skills-and-it'),
  ('Photography', 'photography', 1, 'design-creative'),
  ('Video Making', 'video-making', 2, 'design-creative'),
  ('Communication', 'communication', 1, 'career-readiness'),
  ('Presentation & Public Speaking', 'presentation-public-speaking', 2, 'career-readiness'),
  ('CV Writing & Interview', 'cv-writing-interview', 3, 'career-readiness'),
  ('Spoken English for Kids', 'spoken-english-for-kids', 1, 'kids-age-7-14'),
  ('Negotiation Skills', 'negotiation-skills', 1, 'professional'),
  ('Leadership Excellence', 'leadership-excellence', 2, 'professional')
) as v(name, slug, sort_order, parent_slug)
join public.categories p
  on p.category_group = 'courses' and p.slug = v.parent_slug
on conflict (category_group, slug) do nothing;
