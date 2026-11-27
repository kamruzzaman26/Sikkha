-- Supabase/PostgREST requires table-level SELECT for the authenticated
-- role on these query paths. Existing RLS policies remain enabled and limit
-- customers to their own active orders and admins to authorized order rows.
-- This migration grants no INSERT, UPDATE, or DELETE privileges.
grant select on table public.orders to authenticated;
grant select on table public.order_payment_submissions to authenticated;
