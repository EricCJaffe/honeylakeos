-- Create task_subtasks table
CREATE TABLE public.task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_rich_text TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_task_subtasks_parent ON public.task_subtasks(parent_task_id);
CREATE INDEX idx_task_subtasks_company ON public.task_subtasks(company_id);
CREATE INDEX idx_task_subtasks_status ON public.task_subtasks(status);

-- Enable RLS
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS: Users who can view the parent task can view subtasks
CREATE POLICY "Users can view subtasks of visible tasks"
ON public.task_subtasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_subtasks.parent_task_id
    AND (
      -- Task is in a company the user is a member of
      EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.company_id = t.company_id
        AND m.user_id = auth.uid()
      )
      -- OR task is assigned to the user
      OR EXISTS (
        SELECT 1 FROM public.task_assignees ta
        WHERE ta.task_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- RLS: Users who can edit the parent task can manage subtasks
CREATE POLICY "Users can insert subtasks for editable tasks"
ON public.task_subtasks
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = task_subtasks.company_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update subtasks of editable tasks"
ON public.task_subtasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = task_subtasks.company_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete subtasks of editable tasks"
ON public.task_subtasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = task_subtasks.company_id
    AND m.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_task_subtasks_updated_at
BEFORE UPDATE ON public.task_subtasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logging function for subtasks
CREATE OR REPLACE FUNCTION public.audit_task_subtask_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
    VALUES (NEW.company_id, 'task_subtask', NEW.id, 'created', NEW.created_by, 
      jsonb_build_object('parent_task_id', NEW.parent_task_id, 'title', NEW.title));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes specifically
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
      VALUES (NEW.company_id, 'task_subtask', NEW.id, 
        CASE WHEN NEW.status = 'done' THEN 'completed' ELSE 'uncompleted' END,
        auth.uid(),
        jsonb_build_object('parent_task_id', NEW.parent_task_id, 'title', NEW.title));
    -- Log reordering
    ELSIF OLD.sort_order IS DISTINCT FROM NEW.sort_order THEN
      INSERT INTO public.audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
      VALUES (NEW.company_id, 'task_subtask', NEW.id, 'reordered', auth.uid(),
        jsonb_build_object('from_order', OLD.sort_order, 'to_order', NEW.sort_order));
    -- Log other edits
    ELSIF OLD.title IS DISTINCT FROM NEW.title OR OLD.description_rich_text IS DISTINCT FROM NEW.description_rich_text 
          OR OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
      VALUES (NEW.company_id, 'task_subtask', NEW.id, 'edited', auth.uid(),
        jsonb_build_object('parent_task_id', NEW.parent_task_id, 'title', NEW.title));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
    VALUES (OLD.company_id, 'task_subtask', OLD.id, 'deleted', auth.uid(),
      jsonb_build_object('parent_task_id', OLD.parent_task_id, 'title', OLD.title));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_task_subtask_changes
AFTER INSERT OR UPDATE OR DELETE ON public.task_subtasks
FOR EACH ROW
EXECUTE FUNCTION public.audit_task_subtask_changes();

-- Function to get subtask counts for multiple tasks (for list views)
CREATE OR REPLACE FUNCTION public.get_task_subtask_counts(p_task_ids UUID[])
RETURNS TABLE(task_id UUID, total_count INTEGER, completed_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.parent_task_id,
    COUNT(*)::INTEGER as total_count,
    COUNT(*) FILTER (WHERE ts.status = 'done')::INTEGER as completed_count
  FROM public.task_subtasks ts
  WHERE ts.parent_task_id = ANY(p_task_ids)
  GROUP BY ts.parent_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to copy subtasks for recurring task generation
CREATE OR REPLACE FUNCTION public.copy_subtasks_for_recurring_task(
  p_source_task_id UUID,
  p_target_task_id UUID,
  p_target_company_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.task_subtasks (company_id, parent_task_id, title, description_rich_text, status, due_date, sort_order, created_by)
  SELECT 
    p_target_company_id,
    p_target_task_id,
    title,
    description_rich_text,
    'open',  -- Reset to open
    NULL,    -- Clear due date for new occurrence
    sort_order,
    created_by
  FROM public.task_subtasks
  WHERE parent_task_id = p_source_task_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;