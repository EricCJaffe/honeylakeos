-- Create task_comments table for threaded comments on tasks
CREATE TABLE public.task_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL,
    body_rte TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient task comment lookups
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_company_id ON public.task_comments(company_id);
CREATE INDEX idx_task_comments_created_at ON public.task_comments(created_at);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users who can view the task can view comments
CREATE POLICY "Company members can view task comments"
ON public.task_comments
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.memberships WHERE user_id = auth.uid()
    )
);

-- Users who can edit the task can add comments
CREATE POLICY "Company members can create task comments"
ON public.task_comments
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.memberships WHERE user_id = auth.uid()
    )
    AND author_user_id = auth.uid()
);

-- Company admins or comment author can delete
CREATE POLICY "Admins and authors can delete task comments"
ON public.task_comments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() 
        AND company_id = task_comments.company_id 
        AND role = 'company_admin'
    )
    OR author_user_id = auth.uid()
);