-- ====================================================================
-- Fixes silent RLS failures blocking ENG's Approve/Reject actions:
--   1. sales_orders only allowed BD/ADMIN to write — ENG couldn't
--      update status, rejection_reason, reviewed_by, reviewed_at
--   2. order_status_history had NO insert policy at all (any role)
--   3. notifications had NO general insert policy (only self-updates)
-- All three fail silently in Supabase — no error, just 0 rows changed.
-- ====================================================================

-- 1. sales_orders — allow ENG to update (approve/reject)
drop policy if exists "BD manage sales orders" on sales_orders;
create policy "BD manage sales orders" on sales_orders
    for all using (
        exists (select 1 from user_profiles p where p.id = auth.uid() and p.role in ('BD','ENG','ADMIN'))
    );

-- 2. order_status_history — allow any authenticated user to insert
drop policy if exists "authenticated write history" on order_status_history;
create policy "authenticated write history" on order_status_history
    for insert with check (auth.role() = 'authenticated');

-- 3. notifications — allow any authenticated user to insert
--    (needed because ENGDashboard.vue / MODevelopment.vue insert
--    notifications directly from the client, not via a security-
--    definer function)
drop policy if exists "authenticated write notifications" on notifications;
create policy "authenticated write notifications" on notifications
    for insert with check (auth.role() = 'authenticated');