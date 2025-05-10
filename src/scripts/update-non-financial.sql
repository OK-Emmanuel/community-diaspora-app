--------------------------------------------------------------------------------
-- POLICIES FOR: public.non_financial_members (Dependents)
--------------------------------------------------------------------------------

-- Add community_id to this table if it's not consistently set or backfilled from parent member.
-- The schema already has community_id. Ensure it's populated, perhaps by a trigger from member_id.
CREATE OR REPLACE FUNCTION set_dependent_community_id_from_parent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT m.community_id INTO NEW.community_id
    FROM public.members m
    WHERE m.id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_dependent_community_id ON public.non_financial_members;
CREATE TRIGGER auto_set_dependent_community_id
BEFORE INSERT OR UPDATE OF member_id ON public.non_financial_members
FOR EACH ROW
EXECUTE FUNCTION set_dependent_community_id_from_parent();


-- SELECT Policies
DROP POLICY IF EXISTS "Members can view their own dependents" ON public.non_financial_members;
CREATE POLICY "Financial members can view their own dependents"
ON public.non_financial_members
FOR SELECT
TO authenticated
USING (member_id = auth.uid()); -- Assumes the parent member is the one viewing.

DROP POLICY IF EXISTS "Dependants can select their own record" ON public.non_financial_members;
CREATE POLICY "Dependents can view their own record (if an auth user)"
ON public.non_financial_members
FOR SELECT
TO authenticated
USING (auth_user_id IS NOT NULL AND auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all dependents" ON public.non_financial_members;
CREATE POLICY "Admins can view dependents in their community"
ON public.non_financial_members
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m_admin
        WHERE m_admin.id = auth.uid()
          AND m_admin.role = 'admin'::user_role
          AND m_admin.community_id = non_financial_members.community_id
    )
);

-- INSERT Policies
DROP POLICY IF EXISTS "Financial members can add dependents" ON public.non_financial_members;
CREATE POLICY "Financial members can add their own dependents"
ON public.non_financial_members
FOR INSERT
TO authenticated
WITH CHECK (
    member_id = auth.uid() AND
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.role = 'financial'::user_role
    ) AND
    -- Ensure the dependent's community_id matches the parent financial member's community_id.
    -- The trigger auto_set_dependent_community_id should handle setting it if NULL.
    -- This check ensures it's not explicitly set to something else.
    (non_financial_members.community_id = (SELECT m_parent.community_id FROM public.members m_parent WHERE m_parent.id = auth.uid()))
);

-- UPDATE Policies
DROP POLICY IF EXISTS "Financial members can update their own dependents" ON public.non_financial_members;
CREATE POLICY "Financial members can update their own dependents"
ON public.non_financial_members
FOR UPDATE
TO authenticated
USING (
    member_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'financial'::user_role)
)
WITH CHECK (
    member_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'financial'::user_role) AND
    -- Prevent changing critical fields like member_id or auth_user_id (if already set) by parent.
    -- Allow update of auth_user_id only if it's currently NULL (linking an existing auth user).
    (auth_user_id IS NULL OR auth_user_id = (SELECT nfm.auth_user_id FROM public.non_financial_members nfm WHERE nfm.id = non_financial_members.id)) AND
    (non_financial_members.community_id = (SELECT m_parent.community_id FROM public.members m_parent WHERE m_parent.id = auth.uid()))
);

DROP POLICY IF EXISTS "Dependants can request upgrade (update own record)" ON public.non_financial_members;
CREATE POLICY "Dependents can update their own record (e.g., request upgrade)"
ON public.non_financial_members
FOR UPDATE
TO authenticated
USING (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
WITH CHECK (
    auth_user_id = auth.uid() AND
    -- Dependents should only be able to update specific fields like 'upgrade_requested' or their own contact info.
    -- Prevent them from changing member_id, status (unless it's part of 'upgrade_requested' flow), community_id.
    member_id = (SELECT nfm.member_id FROM public.non_financial_members nfm WHERE nfm.id = non_financial_members.id) AND
    status = (SELECT nfm.status FROM public.non_financial_members nfm WHERE nfm.id = non_financial_members.id) AND /* unless part of upgrade */
    community_id = (SELECT nfm.community_id FROM public.non_financial_members nfm WHERE nfm.id = non_financial_members.id)
    -- 'upgrade_requested' can be freely changed by them.
);

-- Policy: Admins can update dependent records in their community (e.g. status, correct info).
CREATE POLICY "Admins can update dependent records in their community"
ON public.non_financial_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m_admin
        WHERE m_admin.id = auth.uid()
          AND m_admin.role = 'admin'::user_role
          AND m_admin.community_id = non_financial_members.community_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.members m_admin
        WHERE m_admin.id = auth.uid()
          AND m_admin.role = 'admin'::user_role
          AND m_admin.community_id = non_financial_members.community_id
    )
    -- Add checks to prevent admins from changing member_id or auth_user_id without specific procedures.
    AND member_id = (SELECT nfm.member_id FROM public.non_financial_members nfm WHERE nfm.id = non_financial_members.id)
    AND auth_user_id = (SELECT nfm.auth_user_id FROM public.non_financial_members nfm WHERE nfm.id = non_financial_members.id)
);


-- DELETE Policies
DROP POLICY IF EXISTS "Financial members can delete their dependents" ON public.non_financial_members;
CREATE POLICY "Financial members can delete their own dependents"
ON public.non_financial_members
FOR DELETE
TO authenticated
USING (
    member_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'financial'::user_role)
);

-- Admins generally shouldn't delete dependent records directly without good reason/process.
-- Superadmin policy is already handled by your standardized script.

--------------------------------------------------------------------------------
-- END OF POLICIES FOR: public.non_financial_members
--------------------------------------------------------------------------------
