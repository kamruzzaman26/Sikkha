drop policy if exists "Public can read public website settings" on public.site_settings;

create policy "Public can read public website settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (
    key = any (
      array['general'::text, 'seo'::text, 'homepage'::text, 'banners'::text, 'pages'::text, 'navigation'::text]
    )
  );
