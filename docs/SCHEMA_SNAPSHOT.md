# Database Schema Snapshot

**Generated:** 2026-01-16  
**Version:** 0.9.0-beta

---

## Enums

```sql
-- Company Status
CREATE TYPE company_status AS ENUM ('active', 'inactive', 'archived', 'pending', 'suspended');

-- Membership Role  
CREATE TYPE membership_role AS ENUM ('company_admin', 'location_admin', 'module_admin', 'user', 'external');

-- Module Status
CREATE TYPE module_status AS ENUM ('active', 'trial', 'expired', 'suspended');

-- Site Role
CREATE TYPE site_role AS ENUM ('super_admin', 'site_admin');
```

---

## Core Tables

### sites
```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) NOT NULL,
  name TEXT NOT NULL,
  status company_status DEFAULT 'pending',
  primary_color TEXT,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
```

### profiles
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  active_company_id UUID REFERENCES companies(id),
  active_location_id UUID REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### memberships
```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  role membership_role DEFAULT 'user',
  member_type TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  employee_id UUID REFERENCES employees(id),
  default_location_id UUID REFERENCES locations(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### site_memberships
```sql
CREATE TABLE site_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) NOT NULL,
  user_id UUID NOT NULL,
  role site_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Module System

### modules
```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### company_modules
```sql
CREATE TABLE company_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  module_id UUID REFERENCES modules(id) NOT NULL,
  status module_status DEFAULT 'active',
  configuration JSONB DEFAULT '{}',
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
```

---

## Business Domain Tables

### projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  color TEXT DEFAULT '#6366f1',
  emoji TEXT DEFAULT '📁',
  owner_user_id UUID NOT NULL,
  start_date DATE,
  due_date DATE,
  progress INTEGER DEFAULT 0,
  phases JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  template_category TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### tasks
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  phase_id UUID REFERENCES project_phases(id),
  phase TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  order_index INTEGER DEFAULT 0,
  estimated_time INTEGER,
  tags JSONB DEFAULT '[]',
  category JSONB DEFAULT '{}',
  subtasks JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  linked_note_id UUID REFERENCES notes(id),
  -- Recurrence fields
  is_recurring_template BOOLEAN DEFAULT false,
  is_virtual_instance BOOLEAN DEFAULT false,
  is_recurrence_exception BOOLEAN,
  parent_recurring_task_id UUID REFERENCES tasks(id),
  recurrence_rules TEXT,
  recurrence_start_at TIMESTAMPTZ,
  recurrence_end_at TIMESTAMPTZ,
  recurrence_count INTEGER,
  recurrence_timezone TEXT,
  recurrence_exceptions JSONB DEFAULT '[]',
  recurrence_instance_date DATE,
  last_generated_date DATE,
  assigned_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location_text TEXT,
  color TEXT,
  category TEXT,
  timezone TEXT DEFAULT 'UTC',
  reminder_minutes INTEGER,
  linked_task_id UUID REFERENCES tasks(id),
  linked_note_id UUID REFERENCES notes(id),
  -- Recurrence fields
  is_recurring_template BOOLEAN DEFAULT false,
  is_recurrence_exception BOOLEAN,
  parent_recurring_event_id UUID REFERENCES events(id),
  recurrence_rules TEXT,
  recurrence_start_at TIMESTAMPTZ,
  recurrence_end_at TIMESTAMPTZ,
  recurrence_count INTEGER,
  recurrence_exceptions JSONB DEFAULT '[]',
  recurrence_instance_at TIMESTAMPTZ,
  last_generated_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### notes
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  folder_id UUID REFERENCES folders(id),
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'active',
  access_level TEXT DEFAULT 'company',
  color TEXT,
  is_pinned BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  folder_id UUID REFERENCES folders(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  access_level TEXT DEFAULT 'company',
  description TEXT,
  tags JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Helper Functions

```sql
-- Check if user is company member
CREATE FUNCTION is_company_member(p_company_id UUID) RETURNS BOOLEAN;

-- Check if user is company admin
CREATE FUNCTION is_company_admin(p_company_id UUID) RETURNS BOOLEAN;

-- Check if user is site admin
CREATE FUNCTION is_site_admin(p_site_id UUID) RETURNS BOOLEAN;

-- Check if user is super admin
CREATE FUNCTION is_super_admin() RETURNS BOOLEAN;

-- Check if module is enabled for company
CREATE FUNCTION is_module_enabled(p_company_id UUID, p_module_key TEXT) RETURNS BOOLEAN;

-- Get default site ID
CREATE FUNCTION get_default_site_id() RETURNS UUID;

-- Bootstrap first site
CREATE FUNCTION bootstrap_first_site(p_site_name TEXT, p_company_name TEXT) RETURNS JSON;

-- Create project from template
CREATE FUNCTION create_project_from_template(p_template_id UUID, p_company_id UUID, p_name TEXT, p_start_date DATE) RETURNS JSON;

-- Task/Event recurrence expansion
CREATE FUNCTION expand_task_series(p_task_id UUID, p_range_start TEXT, p_range_end TEXT) RETURNS TABLE(...);
CREATE FUNCTION expand_event_series(p_event_id UUID, p_range_start TEXT, p_range_end TEXT) RETURNS TABLE(...);

-- Occurrence management
CREATE FUNCTION complete_task_occurrence(p_series_task_id UUID, p_occurrence_start_at TEXT) RETURNS JSON;
CREATE FUNCTION uncomplete_task_occurrence(p_series_task_id UUID, p_occurrence_start_at TEXT) RETURNS JSON;
CREATE FUNCTION skip_task_occurrence(p_task_id UUID, p_occurrence_date TEXT) RETURNS UUID;
CREATE FUNCTION skip_event_occurrence(p_event_id UUID, p_occurrence_date TEXT) RETURNS UUID;
CREATE FUNCTION create_task_occurrence_override(...) RETURNS UUID;
CREATE FUNCTION create_event_occurrence_override(...) RETURNS UUID;

-- Entity linking
CREATE FUNCTION create_entity_link(...) RETURNS UUID;
CREATE FUNCTION delete_entity_link(p_link_id UUID) RETURNS BOOLEAN;

-- Audit logging
CREATE FUNCTION log_audit_event(...) RETURNS UUID;
```

---

## RLS Policy Patterns

All tables follow these patterns:

```sql
-- SELECT: Company members can read
CREATE POLICY "select_policy" ON table_name FOR SELECT
USING (is_company_member(company_id));

-- INSERT: Company members can create
CREATE POLICY "insert_policy" ON table_name FOR INSERT
WITH CHECK (is_company_member(company_id));

-- UPDATE: Creator or admin can update
CREATE POLICY "update_policy" ON table_name FOR UPDATE
USING (created_by = auth.uid() OR is_company_admin(company_id));

-- DELETE: Creator or admin can delete
CREATE POLICY "delete_policy" ON table_name FOR DELETE
USING (created_by = auth.uid() OR is_company_admin(company_id));
```

Module-enabled tables add:
```sql
-- Additional check for module activation
AND is_module_enabled(company_id, 'module_slug')
```
