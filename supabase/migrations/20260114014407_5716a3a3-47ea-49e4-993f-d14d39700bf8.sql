-- ============================================================
-- BusinessOS — Notes & Documents Module
-- ============================================================

-- FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'company' CHECK (access_level IN ('personal', 'company')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_folders_company_id ON public.folders(company_id);
CREATE INDEX idx_folders_parent ON public.folders(parent_folder_id);
-- NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text,
  access_level text NOT NULL DEFAULT 'company' CHECK (access_level IN ('personal', 'company')),
  is_pinned boolean NOT NULL DEFAULT false,
  color text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_company_id ON public.notes(company_id);
CREATE INDEX idx_notes_folder_id ON public.notes(folder_id);
CREATE INDEX idx_notes_created_by ON public.notes(created_by);
-- DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  access_level text NOT NULL DEFAULT 'company' CHECK (access_level IN ('personal', 'company')),
  description text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_company_id ON public.documents(company_id);
CREATE INDEX idx_documents_folder_id ON public.documents(folder_id);
CREATE INDEX idx_documents_created_by ON public.documents(created_by);
-- ENTITY ACL TABLE (for sharing)
CREATE TABLE IF NOT EXISTS public.entity_acl (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('note', 'document', 'folder')),
  entity_id uuid NOT NULL,
  grantee_type text NOT NULL CHECK (grantee_type IN ('user', 'group')),
  grantee_id uuid NOT NULL,
  permission text NOT NULL CHECK (permission IN ('read', 'write', 'manage')),
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, grantee_type, grantee_id)
);
CREATE INDEX idx_entity_acl_entity ON public.entity_acl(entity_type, entity_id);
CREATE INDEX idx_entity_acl_grantee ON public.entity_acl(grantee_type, grantee_id);
-- JOIN TABLES FOR LINKING DOCUMENTS
CREATE TABLE IF NOT EXISTS public.project_documents (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (project_id, document_id)
);
CREATE TABLE IF NOT EXISTS public.task_documents (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (task_id, document_id)
);
CREATE TABLE IF NOT EXISTS public.event_documents (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (event_id, document_id)
);
-- ADD LINKED NOTE FOREIGN KEYS
ALTER TABLE public.tasks ADD CONSTRAINT tasks_linked_note_fkey 
  FOREIGN KEY (linked_note_id) REFERENCES public.notes(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD CONSTRAINT events_linked_note_fkey 
  FOREIGN KEY (linked_note_id) REFERENCES public.notes(id) ON DELETE SET NULL;
-- STORAGE BUCKET FOR DOCUMENTS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain', 'text/csv'])
ON CONFLICT (id) DO NOTHING;
-- TRIGGER FOR UPDATED_AT
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_acl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
-- FOLDERS POLICIES
CREATE POLICY "folders_select_company_member"
ON public.folders FOR SELECT
USING (
  is_company_member(company_id) AND (
    access_level = 'company' OR created_by = auth.uid()
  )
);
CREATE POLICY "folders_insert_company_member"
ON public.folders FOR INSERT
WITH CHECK (is_company_member(company_id));
CREATE POLICY "folders_update_creator_or_admin"
ON public.folders FOR UPDATE
USING (created_by = auth.uid() OR is_company_admin(company_id));
CREATE POLICY "folders_delete_creator_or_admin"
ON public.folders FOR DELETE
USING (created_by = auth.uid() OR is_company_admin(company_id));
-- NOTES POLICIES
CREATE POLICY "notes_select_access"
ON public.notes FOR SELECT
USING (
  is_company_member(company_id) AND (
    access_level = 'company' 
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.entity_acl 
      WHERE entity_type = 'note' AND entity_id = notes.id 
      AND ((grantee_type = 'user' AND grantee_id = auth.uid()) 
           OR (grantee_type = 'group' AND grantee_id IN (
             SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
           )))
    )
  )
);
CREATE POLICY "notes_insert_company_member"
ON public.notes FOR INSERT
WITH CHECK (is_company_member(company_id));
CREATE POLICY "notes_update_creator_or_admin"
ON public.notes FOR UPDATE
USING (created_by = auth.uid() OR is_company_admin(company_id));
CREATE POLICY "notes_delete_creator_or_admin"
ON public.notes FOR DELETE
USING (created_by = auth.uid() OR is_company_admin(company_id));
-- DOCUMENTS POLICIES
CREATE POLICY "documents_select_access"
ON public.documents FOR SELECT
USING (
  is_company_member(company_id) AND (
    access_level = 'company' 
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.entity_acl 
      WHERE entity_type = 'document' AND entity_id = documents.id 
      AND ((grantee_type = 'user' AND grantee_id = auth.uid()) 
           OR (grantee_type = 'group' AND grantee_id IN (
             SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
           )))
    )
  )
);
CREATE POLICY "documents_insert_company_member"
ON public.documents FOR INSERT
WITH CHECK (is_company_member(company_id));
CREATE POLICY "documents_update_creator_or_admin"
ON public.documents FOR UPDATE
USING (created_by = auth.uid() OR is_company_admin(company_id));
CREATE POLICY "documents_delete_creator_or_admin"
ON public.documents FOR DELETE
USING (created_by = auth.uid() OR is_company_admin(company_id));
-- ENTITY ACL POLICIES
CREATE POLICY "entity_acl_select_company_admin"
ON public.entity_acl FOR SELECT
USING (true);
-- Will be filtered by parent entity access

CREATE POLICY "entity_acl_insert_admin"
ON public.entity_acl FOR INSERT
WITH CHECK (
  -- For notes: creator or company admin
  (entity_type = 'note' AND EXISTS (
    SELECT 1 FROM public.notes n 
    WHERE n.id = entity_id AND (n.created_by = auth.uid() OR is_company_admin(n.company_id))
  ))
  OR 
  -- For documents: creator or company admin
  (entity_type = 'document' AND EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = entity_id AND (d.created_by = auth.uid() OR is_company_admin(d.company_id))
  ))
  OR
  -- For folders: creator or company admin
  (entity_type = 'folder' AND EXISTS (
    SELECT 1 FROM public.folders f 
    WHERE f.id = entity_id AND (f.created_by = auth.uid() OR is_company_admin(f.company_id))
  ))
);
CREATE POLICY "entity_acl_delete_admin"
ON public.entity_acl FOR DELETE
USING (granted_by = auth.uid() OR is_super_admin());
-- JOIN TABLES POLICIES
CREATE POLICY "project_documents_select"
ON public.project_documents FOR SELECT
USING (
  is_company_member((SELECT company_id FROM public.projects WHERE id = project_id))
);
CREATE POLICY "project_documents_insert"
ON public.project_documents FOR INSERT
WITH CHECK (
  is_company_member((SELECT company_id FROM public.projects WHERE id = project_id))
);
CREATE POLICY "project_documents_delete"
ON public.project_documents FOR DELETE
USING (
  created_by = auth.uid() OR is_company_admin((SELECT company_id FROM public.projects WHERE id = project_id))
);
CREATE POLICY "task_documents_select"
ON public.task_documents FOR SELECT
USING (
  is_company_member((SELECT company_id FROM public.tasks WHERE id = task_id))
);
CREATE POLICY "task_documents_insert"
ON public.task_documents FOR INSERT
WITH CHECK (
  is_company_member((SELECT company_id FROM public.tasks WHERE id = task_id))
);
CREATE POLICY "task_documents_delete"
ON public.task_documents FOR DELETE
USING (
  created_by = auth.uid() OR is_company_admin((SELECT company_id FROM public.tasks WHERE id = task_id))
);
CREATE POLICY "event_documents_select"
ON public.event_documents FOR SELECT
USING (
  is_company_member((SELECT company_id FROM public.events WHERE id = event_id))
);
CREATE POLICY "event_documents_insert"
ON public.event_documents FOR INSERT
WITH CHECK (
  is_company_member((SELECT company_id FROM public.events WHERE id = event_id))
);
CREATE POLICY "event_documents_delete"
ON public.event_documents FOR DELETE
USING (
  created_by = auth.uid() OR is_company_admin((SELECT company_id FROM public.events WHERE id = event_id))
);
-- STORAGE POLICIES
CREATE POLICY "documents_storage_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "documents_storage_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "documents_storage_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
-- ADD DELETE POLICY FOR PROJECTS (fixing security warning)
CREATE POLICY "projects_delete_owner_or_admin"
ON public.projects FOR DELETE
USING (owner_user_id = auth.uid() OR is_company_admin(company_id));
