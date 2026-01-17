-- Create task_lists table for grouping tasks
CREATE TABLE public.task_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add list_id foreign key to tasks table
ALTER TABLE public.tasks
ADD COLUMN list_id UUID REFERENCES public.task_lists(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_task_lists_company_id ON public.task_lists(company_id);
CREATE INDEX idx_task_lists_status ON public.task_lists(status);
CREATE INDEX idx_tasks_list_id ON public.tasks(list_id);

-- Enable RLS
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_lists
-- Company members can view task_lists
CREATE POLICY "Company members can view task_lists"
ON public.task_lists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = task_lists.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
  )
);

-- Company admins can insert task_lists
CREATE POLICY "Company admins can insert task_lists"
ON public.task_lists
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = task_lists.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role = 'company_admin'
  )
);

-- Company admins can update task_lists
CREATE POLICY "Company admins can update task_lists"
ON public.task_lists
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = task_lists.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role = 'company_admin'
  )
);

-- Company admins can delete task_lists
CREATE POLICY "Company admins can delete task_lists"
ON public.task_lists
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = task_lists.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role = 'company_admin'
  )
);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_task_lists_updated_at
BEFORE UPDATE ON public.task_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();