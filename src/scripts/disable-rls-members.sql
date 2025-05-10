-- Emergency fix: Completely disable RLS on members table
-- WARNING: This is a temporary security bypass for debugging
BEGIN;

-- Disable RLS protection on members table temporarily
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;

-- Create a log entry to remind us to turn it back on
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

INSERT INTO public.maintenance_logs (action, notes)
VALUES (
  'DISABLED RLS ON MEMBERS TABLE',
  'IMPORTANT: This is a temporary measure to fix recursion issues. Re-enable RLS as soon as possible with: ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;'
);

COMMIT; 