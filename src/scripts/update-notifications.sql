--------------------------------------------------------------------------------
-- POLICIES FOR: public.notifications
--------------------------------------------------------------------------------

-- SELECT Policies for 'notifications'
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications; -- Renaming for consistency
CREATE POLICY "Members can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (member_id = auth.uid());

-- INSERT Policies for 'notifications'
-- Assuming notifications are primarily created by the system for a user,
-- not directly by the user crafting the notification content via API.
-- If the application backend (using service_role or a trusted context) creates notifications:
-- No specific INSERT policy for 'authenticated' role might be needed, as service_role bypasses RLS.
-- OR, if specific functions are used:
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System or user action can create notification for the user" ON public.notifications;

-- NO INSERT POLICY for general 'authenticated' users.
-- Notifications should be created by:
-- 1. Database triggers calling SECURITY DEFINER functions.
-- 2. Trusted backend services using the Supabase service_role key.
-- 3. Specific, trusted PostgreSQL functions exposed via RPC that handle their own security and data validation.

-- If you have a very specific, trusted path where a user's session *must* trigger an insert
-- directly via RLS (not recommended for general notification creation),
-- a highly specific and narrow policy would be needed. For now, assume no direct user inserts.

-- UPDATE Policies for 'notifications'
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Members can mark their own notifications as read/unread"
ON public.notifications
FOR UPDATE
TO authenticated
USING (member_id = auth.uid())
WITH CHECK (
    member_id = auth.uid() AND
    -- Restrict updates to only the 'is_read' field by the user.
    -- All other fields should remain unchanged by this policy.
    title = (SELECT n_old.title FROM public.notifications n_old WHERE n_old.id = notifications.id) AND
    content = (SELECT n_old.content FROM public.notifications n_old WHERE n_old.id = notifications.id) AND
    type = (SELECT n_old.type FROM public.notifications n_old WHERE n_old.id = notifications.id) AND
    link = (SELECT n_old.link FROM public.notifications n_old WHERE n_old.id = notifications.id) AND
    created_at = (SELECT n_old.created_at FROM public.notifications n_old WHERE n_old.id = notifications.id)
    -- member_id check is already in USING and repeated in WITH CHECK for safety.
);

-- DELETE Policies for 'notifications'
-- Let's add a new one if it wasn't explicitly there or to ensure its clarity.
DROP POLICY IF EXISTS "Members can delete their own notifications" ON public.notifications; -- if an old one existed with a different name
CREATE POLICY "Members can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (member_id = auth.uid());

-- Superadmin policy for 'notifications'
-- This is now handled by your standardized "Superadmins have full control" policy
-- in src/scripts/update-superadmins.sql for the 'notifications' table.
-- Make sure 'notifications' is included in that script, e.g.:
-- DROP POLICY IF EXISTS "Superadmins can do all things" ON public.notifications; (if it was JWT based)
-- (The CREATE POLICY "Superadmins have full control" ON public.notifications... is already in your update-superadmins.sql)

--------------------------------------------------------------------------------
-- END OF POLICIES FOR: public.notifications
--------------------------------------------------------------------------------
