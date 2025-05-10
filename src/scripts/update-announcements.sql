--------------------------------------------------------------------------------
-- SCHEMA MODIFICATIONS FOR: public.announcements
--------------------------------------------------------------------------------

-- Add community_id column to announcements table.
-- This can be NULL for global announcements.
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS community_id UUID;

-- Optional: Add a foreign key constraint if you want to enforce that
-- a non-NULL community_id in announcements must exist in the communities table.
-- ALTER TABLE public.announcements
--   ADD CONSTRAINT fk_announcements_community FOREIGN KEY (community_id)
--   REFERENCES public.communities(id) ON DELETE SET NULL; -- Or ON DELETE CASCADE

-- Backfill community_id for existing announcements if applicable.
-- For example, if old announcements by an admin should be tied to their community:
-- UPDATE public.announcements a
-- SET community_id = (
--     SELECT m.community_id
--     FROM public.members m
--     WHERE m.id = a.author_id AND m.role = 'admin'::user_role -- or however you identify relevant authors
-- )
-- WHERE a.community_id IS NULL AND a.author_id IS NOT NULL;
-- (This backfill logic is an example and needs to match your data's intent)

-- Trigger to automatically set community_id for announcements made by an admin,
-- if not explicitly set otherwise (e.g., for a global announcement).
-- This assumes admins creating announcements are tied to a community unless it's a global one.
CREATE OR REPLACE FUNCTION set_announcement_community_id_from_author()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set community_id if it's not provided and the author is an admin with a community_id
  IF NEW.community_id IS NULL AND NEW.author_id IS NOT NULL THEN
    SELECT m.community_id INTO NEW.community_id
    FROM public.members m
    WHERE m.id = NEW.author_id AND (m.role = 'admin'::user_role OR m.role = 'superadmin'::user_role);
    -- If a superadmin creates an announcement without specifying community_id,
    -- it might remain NULL (global) or take their community_id if they have one.
    -- Application logic should be clear: 'global' means community_id IS NULL.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_announcement_community_id ON public.announcements;
CREATE TRIGGER auto_set_announcement_community_id
BEFORE INSERT ON public.announcements
FOR EACH ROW
WHEN (NEW.author_id IS NOT NULL) -- Only run if there's an author
EXECUTE FUNCTION set_announcement_community_id_from_author();

-- Index for faster community-based filtering
CREATE INDEX IF NOT EXISTS idx_announcements_community_id ON public.announcements(community_id);

--------------------------------------------------------------------------------
-- POLICIES FOR: public.announcements
--------------------------------------------------------------------------------

-- SELECT Policies for 'announcements'
-- Dropping old/redundant SELECT policies
DROP POLICY IF EXISTS "Anyone can read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "read_announcements" ON public.announcements;

-- Policy: Authenticated members can view announcements from their own community AND global announcements.
CREATE POLICY "Members can view relevant announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (
    (announcements.community_id IS NULL) OR -- Global announcements
    EXISTS ( -- Announcements from the member's own community
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.community_id = announcements.community_id
    )
);
-- Superadmins are covered by their global "Superadmins can do all things" policy.

-- INSERT Policies for 'announcements'
-- Dropping old/redundant INSERT policies
DROP POLICY IF EXISTS "create_announcements" ON public.announcements;
-- The "Only admins can manage announcements" with command_type '*' is very broad.
-- Let's make specific policies per command for clarity, then drop the general one if fully covered.

-- Policy: Admins can create announcements for their own community or global announcements.
CREATE POLICY "Admins can create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.role = 'admin'::user_role
          AND (
            announcements.community_id = m.community_id OR -- For their own community
            announcements.community_id IS NULL -- For global announcements
          )
    ) AND announcements.author_id = auth.uid()
);
-- Superadmins are covered by their global policy for inserts.

-- UPDATE Policies for 'announcements'
-- Dropping old/redundant UPDATE policies
DROP POLICY IF EXISTS "update_announcements" ON public.announcements;

-- Policy: Admins can update announcements they authored that are for their own community or global.
CREATE POLICY "Admins can update their announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (
    announcements.author_id = auth.uid() AND
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.role = 'admin'::user_role
          AND (
            announcements.community_id = m.community_id OR -- For their own community
            announcements.community_id IS NULL -- For global announcements
          )
    )
)
WITH CHECK (
    announcements.author_id = auth.uid() AND
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.role = 'admin'::user_role
          AND (
            announcements.community_id = m.community_id OR -- For their own community
            announcements.community_id IS NULL
          )
    )
);
-- Superadmins are covered by their global policy for updates.

-- DELETE Policies for 'announcements'
-- Dropping old/redundant DELETE policies
DROP POLICY IF EXISTS "delete_announcements" ON public.announcements;

-- Policy: Admins can delete announcements they authored that are for their own community or global.
CREATE POLICY "Admins can delete their announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (
    announcements.author_id = auth.uid() AND
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.role = 'admin'::user_role
          AND (
            announcements.community_id = m.community_id OR -- For their own community
            announcements.community_id IS NULL -- For global announcements
          )
    )
);
-- Superadmins are covered by their global policy for deletes.


-- Review the broad "Only admins can manage announcements" policy.
-- If the specific CREATE, UPDATE, DELETE policies for admins cover all admin needs,
-- and superadmins have their own blanket policy, this broad one might be redundant or too permissive.
-- The specific policies require author_id match for admins. If admins need to manage *other* admins' announcements
-- within their community, the specific policies above would need adjustment.
-- For now, let's assume admins only manage their *own* authored announcements.

-- If the specific policies are sufficient:
DROP POLICY IF EXISTS "Only admins can manage announcements" ON public.announcements;


--------------------------------------------------------------------------------
-- END OF POLICIES FOR: public.announcements
--------------------------------------------------------------------------------
