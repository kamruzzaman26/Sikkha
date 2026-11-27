-- Restore authenticated read access to order data while preserving row-level security.
-- Customers remain limited to their own orders; admin access remains governed by existing RLS policies.
-- No INSERT, UPDATE, or DELETE privileges are granted here.
grant select on public.orders to authenticated;
grant select on public.order_payment_submissions to authenticated;
