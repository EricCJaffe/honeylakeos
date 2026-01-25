-- Add role column to group_members with default 'member'
ALTER TABLE public.group_members
ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

-- Backfill existing rows (already handled by default, but explicit for clarity)
UPDATE public.group_members SET role = 'member' WHERE role IS NULL;

-- Add CHECK constraint to enforce valid roles
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_role_check CHECK (role IN ('member', 'manager'));