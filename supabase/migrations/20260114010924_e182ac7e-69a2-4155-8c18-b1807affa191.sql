-- ============================================================
-- BusinessOS — SQL Pack #2A (Core Modules: Groups/Projects/Tasks/Events)
-- ============================================================

create extension if not exists "pgcrypto";
-- ----------------------------
-- GROUPS + GROUP MEMBERS
-- ----------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  group_type text default 'team',
  status text default 'active',
  leader_user_id uuid null references auth.users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);
create index if not exists idx_groups_company_id on public.groups(company_id);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_group_members_user_id on public.group_members(user_id);
-- ----------------------------
-- PROJECTS + PROJECT MEMBERS
-- ----------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  emoji text not null default '📋',
  color text not null default '#2563eb',
  owner_user_id uuid not null references auth.users(id),
  phases jsonb not null default '[]'::jsonb,
  progress numeric not null default 0,
  start_date date,
  due_date date,
  is_template boolean not null default false,
  template_category text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);
create index if not exists idx_projects_company_id on public.projects(company_id);
create index if not exists idx_projects_owner on public.projects(owner_user_id);
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists idx_project_members_user on public.project_members(user_id);
-- ----------------------------
-- TASKS + TASK ASSIGNEES
-- ----------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'to_do',
  priority text not null default 'medium',
  phase text,
  due_date date,
  estimated_time numeric,
  tags jsonb not null default '[]'::jsonb,
  category jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  subtasks jsonb not null default '[]'::jsonb,
  notes text,
  order_index numeric not null default 0,
  recurrence_rules text,
  recurrence_exceptions jsonb not null default '[]'::jsonb,
  parent_recurring_task_id uuid null references public.tasks(id) on delete set null,
  is_recurring_template boolean not null default false,
  is_virtual_instance boolean not null default false,
  recurrence_instance_date date,
  last_generated_date date,
  linked_note_id uuid null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  assigned_by uuid null references auth.users(id)
);
create index if not exists idx_tasks_company_id on public.tasks(company_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index if not exists idx_task_assignees_user on public.task_assignees(user_id);
-- ----------------------------
-- EVENTS + EVENT ATTENDEES
-- ----------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  location_text text,
  category text,
  color text,
  timezone text not null default 'America/New_York',
  project_id uuid null references public.projects(id) on delete set null,
  linked_task_id uuid null references public.tasks(id) on delete set null,
  reminder_minutes numeric,
  recurrence_rules text,
  recurrence_exceptions jsonb not null default '[]'::jsonb,
  parent_recurring_event_id uuid null references public.events(id) on delete set null,
  is_recurring_template boolean not null default false,
  recurrence_instance_at timestamptz,
  last_generated_at timestamptz,
  linked_note_id uuid null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);
create index if not exists idx_events_company_id on public.events(company_id);
create index if not exists idx_events_start_at on public.events(start_at);
create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists idx_event_attendees_user on public.event_attendees(user_id);
-- ============================================================
-- RLS POLICIES (Company-scoped pattern)
-- ============================================================

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
-- GROUPS
create policy "groups_select_company_member"
on public.groups for select
using (public.is_company_member(company_id));
create policy "groups_write_company_admin"
on public.groups for insert
with check (public.is_company_admin(company_id));
create policy "groups_update_company_admin"
on public.groups for update
using (public.is_company_admin(company_id));
-- GROUP MEMBERS
create policy "group_members_select_company_member"
on public.group_members for select
using (
  public.is_company_member((select g.company_id from public.groups g where g.id = group_members.group_id))
);
create policy "group_members_write_company_admin"
on public.group_members for insert
with check (
  public.is_company_admin((select g.company_id from public.groups g where g.id = group_members.group_id))
);
-- PROJECTS
create policy "projects_select_company_member"
on public.projects for select
using (public.is_company_member(company_id));
create policy "projects_insert_company_member"
on public.projects for insert
with check (public.is_company_member(company_id));
create policy "projects_update_owner_or_admin"
on public.projects for update
using (owner_user_id = auth.uid() or public.is_company_admin(company_id));
-- PROJECT MEMBERS
create policy "project_members_select_company_member"
on public.project_members for select
using (
  public.is_company_member((select p.company_id from public.projects p where p.id = project_members.project_id))
);
create policy "project_members_write_owner_or_admin"
on public.project_members for insert
with check (
  (select p.owner_user_id from public.projects p where p.id = project_members.project_id) = auth.uid()
  or public.is_company_admin((select p.company_id from public.projects p where p.id = project_members.project_id))
);
-- TASKS
create policy "tasks_select_company_member"
on public.tasks for select
using (public.is_company_member(company_id));
create policy "tasks_insert_company_member"
on public.tasks for insert
with check (public.is_company_member(company_id));
create policy "tasks_update_creator_or_admin"
on public.tasks for update
using (created_by = auth.uid() or public.is_company_admin(company_id));
-- TASK ASSIGNEES
create policy "task_assignees_select_company_member"
on public.task_assignees for select
using (
  public.is_company_member((select t.company_id from public.tasks t where t.id = task_assignees.task_id))
);
create policy "task_assignees_write_creator_or_admin"
on public.task_assignees for insert
with check (
  (select t.created_by from public.tasks t where t.id = task_assignees.task_id) = auth.uid()
  or public.is_company_admin((select t.company_id from public.tasks t where t.id = task_assignees.task_id))
);
-- EVENTS
create policy "events_select_company_member"
on public.events for select
using (public.is_company_member(company_id));
create policy "events_insert_company_member"
on public.events for insert
with check (public.is_company_member(company_id));
create policy "events_update_creator_or_admin"
on public.events for update
using (created_by = auth.uid() or public.is_company_admin(company_id));
-- EVENT ATTENDEES
create policy "event_attendees_select_company_member"
on public.event_attendees for select
using (
  public.is_company_member((select e.company_id from public.events e where e.id = event_attendees.event_id))
);
create policy "event_attendees_write_creator_or_admin"
on public.event_attendees for insert
with check (
  (select e.created_by from public.events e where e.id = event_attendees.event_id) = auth.uid()
  or public.is_company_admin((select e.company_id from public.events e where e.id = event_attendees.event_id))
);
