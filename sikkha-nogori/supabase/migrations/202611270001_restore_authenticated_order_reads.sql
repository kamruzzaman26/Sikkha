-- Restore authenticated read access to order rows while keeping the existing RLS policies.
-- Customers remain limited to their own orders; admin access remains governed by RLS.
-- No INSERT, UPDATE, or DELETE privileges are granted here.
grant select on public.orders to authenticated;
