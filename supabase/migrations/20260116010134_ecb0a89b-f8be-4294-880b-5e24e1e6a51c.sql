-- Add project_id to notes table
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
-- Add project_id to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
-- Create indexes for efficient project-based queries
CREATE INDEX IF NOT EXISTS idx_notes_company_project ON public.notes(company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_project ON public.documents(company_id, project_id);
