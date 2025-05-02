-- Check if the non_financial_members table has appropriate RLS policies
SELECT * FROM pg_policies WHERE tablename = 'non_financial_members';

-- Add policies for non_financial_members table

-- Allow financial members to view their own dependents
CREATE POLICY "Members can view their own dependents"
    ON non_financial_members FOR SELECT
    USING (member_id = auth.uid());

-- Allow admins to view all dependents
CREATE POLICY "Admins can view all dependents"
    ON non_financial_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow financial members to add dependents
CREATE POLICY "Financial members can add dependents"
    ON non_financial_members FOR INSERT
    WITH CHECK (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    );

-- Allow financial members to update their own dependents
CREATE POLICY "Financial members can update their own dependents"
    ON non_financial_members FOR UPDATE
    USING (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    )
    WITH CHECK (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    );

-- Allow financial members to delete their own dependents
CREATE POLICY "Financial members can delete their dependents"
    ON non_financial_members FOR DELETE
    USING (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    ); 