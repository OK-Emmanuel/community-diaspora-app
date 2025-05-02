# Database Fixes

This directory contains SQL scripts to fix issues with the database configuration.

## Fix for RLS Policies on Non-Financial Members

The `fix_rls_non_financial_members.sql` script adds the necessary Row Level Security (RLS) policies to allow financial members to manage their dependents.

### Issue

Financial members couldn't add, update, or delete their dependents due to missing RLS policies on the `non_financial_members` table.

### How to Apply the Fix

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `fix_rls_non_financial_members.sql`
4. Run the script
5. Verify the policies were created by checking the policies under the Authentication > Policies section

### Expected Policies After Fix

The following policies should be added to the `non_financial_members` table:

1. "Members can view their own dependents" - SELECT policy
2. "Admins can view all dependents" - SELECT policy
3. "Financial members can add dependents" - INSERT policy
4. "Financial members can update their own dependents" - UPDATE policy
5. "Financial members can delete their dependents" - DELETE policy

These policies ensure that financial members can manage their own dependents while maintaining proper security boundaries. 