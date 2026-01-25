-- Create attachments table for polymorphic file storage
CREATE TABLE public.attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'note', 'document', 'event')),
    entity_id UUID NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'attachments',
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by_user_id UUID
);

-- Indexes for efficient queries
CREATE INDEX idx_attachments_company_entity ON public.attachments(company_id, entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_entity ON public.attachments(entity_type, entity_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: user must have access to parent entity
CREATE POLICY "Users can view attachments for entities they can access"
ON public.attachments
FOR SELECT
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = attachments.company_id
    )
    AND (
        (entity_type = 'task' AND EXISTS (
            SELECT 1 FROM public.tasks t 
            WHERE t.id = attachments.entity_id 
            AND t.company_id = attachments.company_id
        ))
        OR (entity_type = 'project' AND EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = attachments.entity_id 
            AND p.company_id = attachments.company_id
        ))
        OR (entity_type = 'note' AND EXISTS (
            SELECT 1 FROM public.notes n 
            WHERE n.id = attachments.entity_id 
            AND n.company_id = attachments.company_id
        ))
        OR (entity_type = 'document' AND EXISTS (
            SELECT 1 FROM public.documents d 
            WHERE d.id = attachments.entity_id 
            AND d.company_id = attachments.company_id
        ))
        OR (entity_type = 'event' AND EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = attachments.entity_id 
            AND e.company_id = attachments.company_id
        ))
    )
);

-- INSERT: user must be member of company
CREATE POLICY "Company members can create attachments"
ON public.attachments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = attachments.company_id
    )
    AND owner_user_id = auth.uid()
);

-- UPDATE: for soft delete - owner or admin
CREATE POLICY "Owners and admins can update attachments"
ON public.attachments
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = attachments.company_id
        AND (role = 'company_admin' OR attachments.owner_user_id = auth.uid())
    )
);

-- Create private storage bucket for attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
CREATE POLICY "Users can upload to their company folder"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = 'company'
    AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = (storage.foldername(name))[2]::uuid
    )
);

CREATE POLICY "Users can read from their company folder"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = 'company'
    AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = (storage.foldername(name))[2]::uuid
    )
);

CREATE POLICY "Users can delete from their company folder"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = 'company'
    AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = (storage.foldername(name))[2]::uuid
    )
);