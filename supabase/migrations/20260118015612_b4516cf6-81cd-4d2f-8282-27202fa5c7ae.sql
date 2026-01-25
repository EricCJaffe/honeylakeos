-- Sample Data Batches table
CREATE TABLE public.sample_data_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('business', 'nonprofit', 'church')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.sample_data_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company admins can manage sample batches"
  ON public.sample_data_batches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = sample_data_batches.company_id
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
    )
  );

-- Add sample_batch_id to relevant tables
ALTER TABLE public.tasks ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.projects ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.crm_clients ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.crm_clients ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.sales_opportunities ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.sales_opportunities ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.invoices ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.reports ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.donor_profiles ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.donor_profiles ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.donations ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.donations ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.donor_campaigns ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.donor_campaigns ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.receipts ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.receipts ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.lms_courses ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.lms_courses ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.notes ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.task_lists ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.task_lists ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.project_phases ADD COLUMN sample_batch_id UUID REFERENCES public.sample_data_batches(id) ON DELETE CASCADE;
ALTER TABLE public.project_phases ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for sample data filtering
CREATE INDEX idx_tasks_sample ON public.tasks(company_id, is_sample) WHERE is_sample = true;
CREATE INDEX idx_projects_sample ON public.projects(company_id, is_sample) WHERE is_sample = true;
CREATE INDEX idx_crm_clients_sample ON public.crm_clients(company_id, is_sample) WHERE is_sample = true;

-- Function to create sample data
CREATE OR REPLACE FUNCTION public.create_sample_data(
  p_company_id UUID,
  p_batch_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id UUID;
  v_user_id UUID;
  v_task_list_1_id UUID;
  v_task_list_2_id UUID;
  v_project_id UUID;
  v_client_id UUID;
  v_pipeline_id UUID;
  v_donor_1_id UUID;
  v_donor_2_id UUID;
  v_campaign_id UUID;
  v_crm_client_1_id UUID;
  v_crm_client_2_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check for existing active batch
  IF EXISTS (
    SELECT 1 FROM sample_data_batches 
    WHERE company_id = p_company_id AND removed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Company already has active sample data';
  END IF;
  
  -- Create batch
  INSERT INTO sample_data_batches (company_id, created_by_user_id, batch_type)
  VALUES (p_company_id, v_user_id, p_batch_type)
  RETURNING id INTO v_batch_id;
  
  IF p_batch_type = 'business' THEN
    -- Create task lists
    INSERT INTO task_lists (company_id, name, scope, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'Sample: Sales Tasks', 'company', v_user_id, v_batch_id, true)
    RETURNING id INTO v_task_list_1_id;
    
    INSERT INTO task_lists (company_id, name, scope, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'Sample: Operations', 'company', v_user_id, v_batch_id, true)
    RETURNING id INTO v_task_list_2_id;
    
    -- Create tasks
    INSERT INTO tasks (company_id, title, description, status, priority, task_list_id, created_by, sample_batch_id, is_sample)
    VALUES 
      (p_company_id, 'Sample: Follow up with lead', 'Send proposal to interested client', 'todo', 'high', v_task_list_1_id, v_user_id, v_batch_id, true),
      (p_company_id, 'Sample: Schedule discovery call', 'Book 30min call with prospect', 'todo', 'medium', v_task_list_1_id, v_user_id, v_batch_id, true),
      (p_company_id, 'Sample: Review contract terms', 'Legal review needed', 'in_progress', 'high', v_task_list_1_id, v_user_id, v_batch_id, true),
      (p_company_id, 'Sample: Update CRM records', 'Weekly data cleanup', 'todo', 'low', v_task_list_2_id, v_user_id, v_batch_id, true),
      (p_company_id, 'Sample: Prepare quarterly report', 'Q1 metrics summary', 'todo', 'medium', v_task_list_2_id, v_user_id, v_batch_id, true);
    
    -- Create project with phases
    INSERT INTO projects (company_id, name, description, status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'Sample: Client Onboarding Project', 'Standard onboarding workflow for new clients', 'active', v_user_id, v_batch_id, true)
    RETURNING id INTO v_project_id;
    
    INSERT INTO project_phases (project_id, name, sort_order, company_id, sample_batch_id, is_sample)
    VALUES 
      (v_project_id, 'Discovery', 1, p_company_id, v_batch_id, true),
      (v_project_id, 'Setup', 2, p_company_id, v_batch_id, true),
      (v_project_id, 'Training', 3, p_company_id, v_batch_id, true);
    
    -- Create CRM client
    INSERT INTO crm_clients (company_id, type, org_name, org_email, lifecycle_status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'organization', 'Sample Corp', 'contact@samplecorp.example', 'prospect', v_user_id, v_batch_id, true)
    RETURNING id INTO v_client_id;
    
    -- Create opportunity if pipeline exists
    SELECT id INTO v_pipeline_id FROM sales_pipelines WHERE company_id = p_company_id LIMIT 1;
    IF v_pipeline_id IS NOT NULL THEN
      INSERT INTO sales_opportunities (company_id, pipeline_id, crm_client_id, name, value, currency, status, created_by, sample_batch_id, is_sample)
      VALUES (p_company_id, v_pipeline_id, v_client_id, 'Sample: Enterprise Deal', 50000, 'USD', 'open', v_user_id, v_batch_id, true);
    END IF;
    
    -- Create draft invoice
    INSERT INTO invoices (company_id, invoice_number, status, total_amount, currency, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'SAMPLE-001', 'draft', 5000, 'USD', v_user_id, v_batch_id, true);
    
  ELSIF p_batch_type = 'nonprofit' THEN
    -- Create CRM clients for donors
    INSERT INTO crm_clients (company_id, type, person_full_name, person_email, lifecycle_status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'individual', 'Sample: John Donor', 'john.donor@example.com', 'active', v_user_id, v_batch_id, true)
    RETURNING id INTO v_crm_client_1_id;
    
    INSERT INTO crm_clients (company_id, type, person_full_name, person_email, lifecycle_status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'individual', 'Sample: Jane Giver', 'jane.giver@example.com', 'active', v_user_id, v_batch_id, true)
    RETURNING id INTO v_crm_client_2_id;
    
    -- Create donor profiles
    INSERT INTO donor_profiles (company_id, crm_client_id, donor_status, lifetime_giving_amount, sample_batch_id, is_sample)
    VALUES (p_company_id, v_crm_client_1_id, 'active', 1500, v_batch_id, true)
    RETURNING id INTO v_donor_1_id;
    
    INSERT INTO donor_profiles (company_id, crm_client_id, donor_status, lifetime_giving_amount, sample_batch_id, is_sample)
    VALUES (p_company_id, v_crm_client_2_id, 'active', 2500, v_batch_id, true)
    RETURNING id INTO v_donor_2_id;
    
    -- Create campaign
    INSERT INTO donor_campaigns (company_id, name, description, goal_amount, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'Sample: Annual Fund', 'Year-end giving campaign', 100000, v_user_id, v_batch_id, true)
    RETURNING id INTO v_campaign_id;
    
    -- Create donations
    INSERT INTO donations (company_id, donor_profile_id, campaign_id, amount, donation_date, status, created_by, sample_batch_id, is_sample)
    VALUES 
      (p_company_id, v_donor_1_id, v_campaign_id, 500, CURRENT_DATE - INTERVAL '30 days', 'completed', v_user_id, v_batch_id, true),
      (p_company_id, v_donor_2_id, v_campaign_id, 1000, CURRENT_DATE - INTERVAL '15 days', 'completed', v_user_id, v_batch_id, true);
    
    -- Create receipt
    INSERT INTO receipts (company_id, receipt_number, status, total_amount, currency, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'SAMPLE-R001', 'issued', 1500, 'USD', v_user_id, v_batch_id, true);
    
    -- Create fundraising project
    INSERT INTO projects (company_id, name, description, status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'Sample: Gala Planning', 'Annual fundraising gala event', 'active', v_user_id, v_batch_id, true);
    
  ELSIF p_batch_type = 'church' THEN
    -- Create CRM clients as members
    INSERT INTO crm_clients (company_id, type, person_full_name, person_email, lifecycle_status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'individual', 'Sample: Mary Member', 'mary.member@example.com', 'active', v_user_id, v_batch_id, true)
    RETURNING id INTO v_crm_client_1_id;
    
    INSERT INTO crm_clients (company_id, type, person_full_name, person_email, lifecycle_status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'individual', 'Sample: David Deacon', 'david.deacon@example.com', 'active', v_user_id, v_batch_id, true)
    RETURNING id INTO v_crm_client_2_id;
    
    -- Create donor profiles for giving
    INSERT INTO donor_profiles (company_id, crm_client_id, donor_status, lifetime_giving_amount, sample_batch_id, is_sample)
    VALUES (p_company_id, v_crm_client_1_id, 'active', 3600, v_batch_id, true)
    RETURNING id INTO v_donor_1_id;
    
    INSERT INTO donor_profiles (company_id, crm_client_id, donor_status, lifetime_giving_amount, sample_batch_id, is_sample)
    VALUES (p_company_id, v_crm_client_2_id, 'active', 6000, v_batch_id, true)
    RETURNING id INTO v_donor_2_id;
    
    -- Create giving records
    INSERT INTO donations (company_id, donor_profile_id, amount, donation_date, status, created_by, sample_batch_id, is_sample)
    VALUES 
      (p_company_id, v_donor_1_id, 300, CURRENT_DATE - INTERVAL '7 days', 'completed', v_user_id, v_batch_id, true),
      (p_company_id, v_donor_2_id, 500, CURRENT_DATE - INTERVAL '7 days', 'completed', v_user_id, v_batch_id, true);
    
    -- Create LMS course
    INSERT INTO lms_courses (company_id, title, description, status, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'Sample: New Member Class', 'Introduction to our church community', 'published', v_user_id, v_batch_id, true);
    
    -- Create pastoral note
    INSERT INTO notes (company_id, title, content, created_by, sample_batch_id, is_sample)
    VALUES (p_company_id, 'Sample: Pastoral Visit Notes', 'Follow-up care visit with the Johnson family. They are adjusting well to the community.', v_user_id, v_batch_id, true);
  END IF;
  
  RETURN v_batch_id;
END;
$$;

-- Function to remove sample data
CREATE OR REPLACE FUNCTION public.remove_sample_data(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id UUID;
BEGIN
  -- Find active batch
  SELECT id INTO v_batch_id
  FROM sample_data_batches
  WHERE company_id = p_company_id AND removed_at IS NULL;
  
  IF v_batch_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delete records that reference the batch (order matters for FK constraints)
  DELETE FROM donations WHERE sample_batch_id = v_batch_id;
  DELETE FROM donor_profiles WHERE sample_batch_id = v_batch_id;
  DELETE FROM donor_campaigns WHERE sample_batch_id = v_batch_id;
  DELETE FROM sales_opportunities WHERE sample_batch_id = v_batch_id;
  DELETE FROM tasks WHERE sample_batch_id = v_batch_id;
  DELETE FROM task_lists WHERE sample_batch_id = v_batch_id;
  DELETE FROM project_phases WHERE sample_batch_id = v_batch_id;
  DELETE FROM projects WHERE sample_batch_id = v_batch_id;
  DELETE FROM crm_clients WHERE sample_batch_id = v_batch_id;
  DELETE FROM invoices WHERE sample_batch_id = v_batch_id;
  DELETE FROM receipts WHERE sample_batch_id = v_batch_id;
  DELETE FROM lms_courses WHERE sample_batch_id = v_batch_id;
  DELETE FROM notes WHERE sample_batch_id = v_batch_id;
  DELETE FROM reports WHERE sample_batch_id = v_batch_id;
  
  -- Mark batch as removed
  UPDATE sample_data_batches
  SET removed_at = now()
  WHERE id = v_batch_id;
  
  RETURN true;
END;
$$;

-- Function to check if company has active sample data
CREATE OR REPLACE FUNCTION public.has_active_sample_data(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sample_data_batches
    WHERE company_id = p_company_id AND removed_at IS NULL
  );
$$;

-- Function to get active sample batch info
CREATE OR REPLACE FUNCTION public.get_active_sample_batch(p_company_id UUID)
RETURNS TABLE(id UUID, batch_type TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, batch_type, created_at
  FROM sample_data_batches
  WHERE company_id = p_company_id AND removed_at IS NULL
  LIMIT 1;
$$;