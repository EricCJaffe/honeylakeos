-- Add status column to notes table for active/archived support
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);
-- Add comment for documentation
COMMENT ON COLUMN public.notes.status IS 'Note status: active or archived';
