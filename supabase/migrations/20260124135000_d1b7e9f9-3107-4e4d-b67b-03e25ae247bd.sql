-- Add pinning columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamptz NULL;
-- Add pinning columns to notes table
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamptz NULL;
-- Add indexes for efficient pinned queries
CREATE INDEX IF NOT EXISTS idx_tasks_pinned ON public.tasks (company_id, is_pinned, pinned_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes (company_id, is_pinned, pinned_at DESC NULLS LAST);
-- Add comment for documentation
COMMENT ON COLUMN public.tasks.is_pinned IS 'Whether the task is pinned to the top of lists';
COMMENT ON COLUMN public.tasks.pinned_at IS 'When the task was pinned (null if not pinned)';
COMMENT ON COLUMN public.notes.is_pinned IS 'Whether the note is pinned to the top of lists';
COMMENT ON COLUMN public.notes.pinned_at IS 'When the note was pinned (null if not pinned)';
