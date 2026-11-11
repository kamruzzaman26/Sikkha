-- Keep the workflow status and public visibility flag aligned.
-- Public reads must require both fields so a draft cannot be exposed by an inconsistent row.

alter policy "Public can resolve products with active affiliate links"
on public.products
using (
  status = 'published'::public.content_status
  and is_published
  and archived_at is null
  and commerce_mode is not null
);

alter policy "Restrict products to published rows or admins"
on public.products
using (
  (
    status = 'published'::public.content_status
    and is_published
    and archived_at is null
    and commerce_mode is not null
  )
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
      and admin_users.role = any (array['admin'::text, 'editor'::text])
  )
);
