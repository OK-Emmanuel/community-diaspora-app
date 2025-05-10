--------------------------------------------------------------------------------
-- POLICIES FOR: public.community_invites
--------------------------------------------------------------------------------

-- SELECT Policies:
-- Who needs to read invite links?
-- - Admins/Superadmins who created them or manage the community.
-- - Possibly a system process that validates a token.

-- Policy: Admins can view invite links for their own community.
CREATE POLICY "Admins can view invites for their community"
ON public.community_invites
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = community_invites.community_id
    )
);

-- Validating a token is usually done without user context or with anon role on a specific lookup,
-- often via a dedicated function rather than direct table SELECT by anon.
-- Let's assume for now, users don't directly query this table with a token.
-- The backend would lookup the token (e.g. using service_role or a specific function).

-- INSERT Policies:
-- Policy: Admins can create invite links for their own community.
CREATE POLICY "Admins can create invites for their community"
ON public.community_invites
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = community_invites.community_id
    )
    -- Consider adding a check to ensure 'invite_token' is system-generated or unique,
    -- though the unique constraint handles the latter. The application should generate the token.
    -- 'expires_at' and 'used' should be handled by application logic/defaults.
);

-- UPDATE Policies:
-- Generally, invites are not "updated" extensively. 'used' status might be updated by the system
-- when an invite is consumed, or 'expires_at' might be modified.

-- Policy: Admins can update specific fields of invites for their community (e.g., expires_at).
CREATE POLICY "Admins can update invites for their community"
ON public.community_invites
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = community_invites.community_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = community_invites.community_id
    ) AND
    -- Prevent changing community_id or invite_token.
    community_id = (SELECT ci.community_id FROM public.community_invites ci WHERE ci.id = community_invites.id) AND
    invite_token = (SELECT ci.invite_token FROM public.community_invites ci WHERE ci.id = community_invites.id)
    -- Allow changes to 'expires_at', 'used' (though 'used' is often system-set).
);

-- A system process (e.g., after a user successfully joins via an invite) would mark an invite as 'used'.
-- This often happens via a backend function using service_role or a SECURITY DEFINER function.

-- DELETE Policies:
-- Policy: Admins can delete invite links for their own community.
CREATE POLICY "Admins can delete invites for their community"
ON public.community_invites
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = community_invites.community_id
    )
);

-- Superadmin policy for 'community_invites'
-- Covered by your standardized "Superadmins have full control" policy.
-- Ensure 'community_invites' is in src/scripts/update-superadmins.sql.

--------------------------------------------------------------------------------
-- END OF POLICIES FOR: public.community_invites
--------------------------------------------------------------------------------
