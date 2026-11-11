-- Expand the non-book marketplace taxonomy using Rokomari's public
-- Super Store and electronics navigation. Existing categories are preserved.
insert into public.categories (name, slug, category_group, sort_order, parent_id, source)
select v.name, v.slug, 'products', v.sort_order, p.id, 'rokomari'
from (values
  ('Audiobook', 'audiobook', 13),
  ('Beauty & Health', 'beauty-health', 14),
  ('Food Products', 'food-products', 15),
  ('Kitchen Appliances', 'kitchen-appliances', 16),
  ('Bags and Travel', 'bags-and-travel', 17),
  ('Fashion', 'fashion', 18),
  ('Software and Multimedia', 'software-multimedia', 19),
  ('Tools, DIY & Outdoor', 'tools-diy-outdoor', 20),
  ('Furniture & Decor', 'furniture-decor', 21),
  ('Bedding & Bath', 'bedding-bath', 22),
  ('Hobby, Art and Culture', 'hobby-art-culture', 23),
  ('Sports & Outdoors', 'sports-outdoors', 24),
  ('Pet Supplies', 'pet-supplies', 25),
  ('Home Appliances', 'home-appliances', 26)
) as v(name, slug, sort_order)
join public.categories p
  on p.category_group = 'products'
 and p.slug = 'super-store'
on conflict (category_group, slug) do nothing;

insert into public.categories (name, slug, category_group, sort_order, parent_id, source)
select v.name, v.slug, 'electronics', v.sort_order, p.id, 'rokomari'
from (values
  ('Power Bank', 'power-bank', 11),
  ('Wearable Technologies', 'wearable-technologies', 12)
) as v(name, slug, sort_order)
join public.categories p
  on p.category_group = 'electronics'
 and p.slug = 'electronics-main'
on conflict (category_group, slug) do nothing;
