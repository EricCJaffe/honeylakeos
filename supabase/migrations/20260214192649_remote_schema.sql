drop extension if exists "pg_net";
drop policy "memberships_select_own_or_admin" on "public"."memberships";
drop policy "memberships_select_self" on "public"."memberships";
drop policy "Users can view their own profile" on "public"."profiles";
alter table "public"."memberships" drop constraint "memberships_user_id_fkey";
alter table "public"."profiles" drop constraint "profiles_user_id_fkey";
create table "public"."_fk_backup" (
    "schema_name" name,
    "table_name" name,
    "constraint_name" name,
    "constraint_def" text
      );
create table "public"."board_meeting_action_items" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid not null,
    "agenda_item_id" uuid,
    "task_id" uuid,
    "title" text not null,
    "description" text,
    "assigned_to" uuid,
    "status" text default 'pending'::text,
    "priority" text default 'medium'::text,
    "due_date" date,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );
alter table "public"."board_meeting_action_items" enable row level security;
create table "public"."board_meeting_agenda_items" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid not null,
    "title" text not null,
    "description" text,
    "item_type" text default 'discussion'::text,
    "presenter_user_id" uuid,
    "sort_order" integer not null default 0,
    "allocated_minutes" integer,
    "actual_minutes" integer,
    "content" jsonb default '{}'::jsonb,
    "status" text default 'pending'::text,
    "requires_vote" boolean default false,
    "vote_threshold_percentage" numeric(5,2) default 50.00,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone
      );
alter table "public"."board_meeting_agenda_items" enable row level security;
create table "public"."board_meeting_attendees" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'member'::text,
    "attendance_status" text default 'pending'::text,
    "is_voting_member" boolean default true,
    "proxy_for_user_id" uuid,
    "proxy_granted_at" timestamp with time zone,
    "materials_viewed_at" timestamp with time zone,
    "last_comment_at" timestamp with time zone,
    "engagement_count" integer default 0,
    "invited_at" timestamp with time zone default now(),
    "responded_at" timestamp with time zone,
    "checked_in_at" timestamp with time zone
      );
alter table "public"."board_meeting_attendees" enable row level security;
create table "public"."board_meeting_ballots" (
    "id" uuid not null default gen_random_uuid(),
    "vote_id" uuid not null,
    "user_id" uuid not null,
    "choice" text not null,
    "voted_as_proxy_for" uuid,
    "comments" text,
    "voted_at" timestamp with time zone default now()
      );
alter table "public"."board_meeting_ballots" enable row level security;
create table "public"."board_meeting_comments" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid not null,
    "agenda_item_id" uuid,
    "user_id" uuid not null,
    "content" text not null,
    "parent_comment_id" uuid,
    "is_private" boolean default false,
    "edited" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );
alter table "public"."board_meeting_comments" enable row level security;
create table "public"."board_meeting_documents" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid not null,
    "document_id" uuid,
    "title" text not null,
    "document_type" text default 'board_book'::text,
    "description" text,
    "file_url" text,
    "file_size_bytes" bigint,
    "mime_type" text,
    "version" text default '1.0'::text,
    "is_final" boolean default false,
    "requires_approval" boolean default false,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );
alter table "public"."board_meeting_documents" enable row level security;
create table "public"."board_meeting_templates" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "name" text not null,
    "description" text,
    "category" text default 'custom'::text,
    "default_duration_minutes" integer default 60,
    "default_agenda" jsonb default '[]'::jsonb,
    "default_documents" jsonb default '[]'::jsonb,
    "pre_meeting_checklist" jsonb default '[]'::jsonb,
    "post_meeting_checklist" jsonb default '[]'::jsonb,
    "is_public" boolean default false,
    "is_system_template" boolean default false,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );
alter table "public"."board_meeting_templates" enable row level security;
create table "public"."board_meeting_views" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid not null,
    "user_id" uuid not null,
    "viewed_section" text,
    "document_id" uuid,
    "duration_seconds" integer,
    "viewed_at" timestamp with time zone default now()
      );
alter table "public"."board_meeting_views" enable row level security;
create table "public"."board_meeting_votes" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid not null,
    "agenda_item_id" uuid,
    "title" text not null,
    "description" text,
    "vote_type" text default 'resolution'::text,
    "requires_unanimous" boolean default false,
    "threshold_percentage" numeric(5,2) default 50.00,
    "allows_abstain" boolean default true,
    "is_secret_ballot" boolean default false,
    "status" text default 'pending'::text,
    "votes_for" integer default 0,
    "votes_against" integer default 0,
    "votes_abstain" integer default 0,
    "total_eligible_voters" integer,
    "result" text,
    "is_pre_vote" boolean default false,
    "created_at" timestamp with time zone default now(),
    "opened_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "updated_at" timestamp with time zone default now()
      );
alter table "public"."board_meeting_votes" enable row level security;
create table "public"."board_meetings" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "created_by" uuid,
    "owner_user_id" uuid,
    "title" text not null,
    "meeting_type" text not null default 'regular'::text,
    "description" text,
    "status" text not null default 'draft'::text,
    "scheduled_at" timestamp with time zone,
    "duration_minutes" integer,
    "location" text,
    "meeting_url" text,
    "timezone" text default 'America/New_York'::text,
    "requires_quorum" boolean default true,
    "quorum_percentage" numeric(5,2) default 50.00,
    "voting_enabled" boolean default true,
    "allows_proxies" boolean default false,
    "template_id" uuid,
    "project_id" uuid,
    "tags" jsonb not null default '[]'::jsonb,
    "custom_fields" jsonb not null default '{}'::jsonb,
    "preparation_time_hours" numeric(10,2),
    "engagement_score" numeric(5,2),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "archived_at" timestamp with time zone
      );
alter table "public"."board_meetings" enable row level security;
CREATE UNIQUE INDEX board_meeting_action_items_pkey ON public.board_meeting_action_items USING btree (id);
CREATE UNIQUE INDEX board_meeting_agenda_items_pkey ON public.board_meeting_agenda_items USING btree (id);
CREATE UNIQUE INDEX board_meeting_attendees_meeting_id_user_id_key ON public.board_meeting_attendees USING btree (meeting_id, user_id);
CREATE UNIQUE INDEX board_meeting_attendees_pkey ON public.board_meeting_attendees USING btree (id);
CREATE UNIQUE INDEX board_meeting_ballots_pkey ON public.board_meeting_ballots USING btree (id);
CREATE UNIQUE INDEX board_meeting_ballots_vote_id_user_id_key ON public.board_meeting_ballots USING btree (vote_id, user_id);
CREATE UNIQUE INDEX board_meeting_comments_pkey ON public.board_meeting_comments USING btree (id);
CREATE UNIQUE INDEX board_meeting_documents_pkey ON public.board_meeting_documents USING btree (id);
CREATE UNIQUE INDEX board_meeting_templates_pkey ON public.board_meeting_templates USING btree (id);
CREATE UNIQUE INDEX board_meeting_views_pkey ON public.board_meeting_views USING btree (id);
CREATE UNIQUE INDEX board_meeting_votes_pkey ON public.board_meeting_votes USING btree (id);
CREATE UNIQUE INDEX board_meetings_pkey ON public.board_meetings USING btree (id);
CREATE INDEX idx_board_meeting_action_items_meeting_id ON public.board_meeting_action_items USING btree (meeting_id);
CREATE INDEX idx_board_meeting_action_items_task_id ON public.board_meeting_action_items USING btree (task_id);
CREATE INDEX idx_board_meeting_agenda_items_meeting_id ON public.board_meeting_agenda_items USING btree (meeting_id);
CREATE INDEX idx_board_meeting_agenda_items_sort_order ON public.board_meeting_agenda_items USING btree (meeting_id, sort_order);
CREATE INDEX idx_board_meeting_attendees_meeting_id ON public.board_meeting_attendees USING btree (meeting_id);
CREATE INDEX idx_board_meeting_attendees_user_id ON public.board_meeting_attendees USING btree (user_id);
CREATE INDEX idx_board_meeting_ballots_user_id ON public.board_meeting_ballots USING btree (user_id);
CREATE INDEX idx_board_meeting_ballots_vote_id ON public.board_meeting_ballots USING btree (vote_id);
CREATE INDEX idx_board_meeting_comments_agenda_item_id ON public.board_meeting_comments USING btree (agenda_item_id);
CREATE INDEX idx_board_meeting_comments_meeting_id ON public.board_meeting_comments USING btree (meeting_id);
CREATE INDEX idx_board_meeting_documents_document_id ON public.board_meeting_documents USING btree (document_id);
CREATE INDEX idx_board_meeting_documents_meeting_id ON public.board_meeting_documents USING btree (meeting_id);
CREATE INDEX idx_board_meeting_templates_category ON public.board_meeting_templates USING btree (category);
CREATE INDEX idx_board_meeting_templates_company_id ON public.board_meeting_templates USING btree (company_id);
CREATE INDEX idx_board_meeting_views_meeting_id ON public.board_meeting_views USING btree (meeting_id);
CREATE INDEX idx_board_meeting_views_user_id ON public.board_meeting_views USING btree (user_id);
CREATE INDEX idx_board_meeting_votes_agenda_item_id ON public.board_meeting_votes USING btree (agenda_item_id);
CREATE INDEX idx_board_meeting_votes_meeting_id ON public.board_meeting_votes USING btree (meeting_id);
CREATE INDEX idx_board_meeting_votes_status ON public.board_meeting_votes USING btree (status);
CREATE INDEX idx_board_meetings_company_id ON public.board_meetings USING btree (company_id);
CREATE INDEX idx_board_meetings_project_id ON public.board_meetings USING btree (project_id);
CREATE INDEX idx_board_meetings_scheduled_at ON public.board_meetings USING btree (scheduled_at);
CREATE INDEX idx_board_meetings_status ON public.board_meetings USING btree (status);
CREATE INDEX idx_board_meetings_template_id ON public.board_meetings USING btree (template_id);
alter table "public"."board_meeting_action_items" add constraint "board_meeting_action_items_pkey" PRIMARY KEY using index "board_meeting_action_items_pkey";
alter table "public"."board_meeting_agenda_items" add constraint "board_meeting_agenda_items_pkey" PRIMARY KEY using index "board_meeting_agenda_items_pkey";
alter table "public"."board_meeting_attendees" add constraint "board_meeting_attendees_pkey" PRIMARY KEY using index "board_meeting_attendees_pkey";
alter table "public"."board_meeting_ballots" add constraint "board_meeting_ballots_pkey" PRIMARY KEY using index "board_meeting_ballots_pkey";
alter table "public"."board_meeting_comments" add constraint "board_meeting_comments_pkey" PRIMARY KEY using index "board_meeting_comments_pkey";
alter table "public"."board_meeting_documents" add constraint "board_meeting_documents_pkey" PRIMARY KEY using index "board_meeting_documents_pkey";
alter table "public"."board_meeting_templates" add constraint "board_meeting_templates_pkey" PRIMARY KEY using index "board_meeting_templates_pkey";
alter table "public"."board_meeting_views" add constraint "board_meeting_views_pkey" PRIMARY KEY using index "board_meeting_views_pkey";
alter table "public"."board_meeting_votes" add constraint "board_meeting_votes_pkey" PRIMARY KEY using index "board_meeting_votes_pkey";
alter table "public"."board_meetings" add constraint "board_meetings_pkey" PRIMARY KEY using index "board_meetings_pkey";
alter table "public"."board_meeting_action_items" add constraint "board_meeting_action_items_agenda_item_id_fkey" FOREIGN KEY (agenda_item_id) REFERENCES public.board_meeting_agenda_items(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_action_items" validate constraint "board_meeting_action_items_agenda_item_id_fkey";
alter table "public"."board_meeting_action_items" add constraint "board_meeting_action_items_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_action_items" validate constraint "board_meeting_action_items_assigned_to_fkey";
alter table "public"."board_meeting_action_items" add constraint "board_meeting_action_items_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_action_items" validate constraint "board_meeting_action_items_meeting_id_fkey";
alter table "public"."board_meeting_action_items" add constraint "board_meeting_action_items_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_action_items" validate constraint "board_meeting_action_items_task_id_fkey";
alter table "public"."board_meeting_action_items" add constraint "valid_action_status" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))) not valid;
alter table "public"."board_meeting_action_items" validate constraint "valid_action_status";
alter table "public"."board_meeting_action_items" add constraint "valid_priority" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))) not valid;
alter table "public"."board_meeting_action_items" validate constraint "valid_priority";
alter table "public"."board_meeting_agenda_items" add constraint "board_meeting_agenda_items_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_agenda_items" validate constraint "board_meeting_agenda_items_meeting_id_fkey";
alter table "public"."board_meeting_agenda_items" add constraint "board_meeting_agenda_items_presenter_user_id_fkey" FOREIGN KEY (presenter_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_agenda_items" validate constraint "board_meeting_agenda_items_presenter_user_id_fkey";
alter table "public"."board_meeting_agenda_items" add constraint "valid_item_status" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'deferred'::text]))) not valid;
alter table "public"."board_meeting_agenda_items" validate constraint "valid_item_status";
alter table "public"."board_meeting_agenda_items" add constraint "valid_item_type" CHECK ((item_type = ANY (ARRAY['discussion'::text, 'presentation'::text, 'vote'::text, 'information'::text, 'executive_session'::text]))) not valid;
alter table "public"."board_meeting_agenda_items" validate constraint "valid_item_type";
alter table "public"."board_meeting_agenda_items" add constraint "valid_sort_order" CHECK ((sort_order >= 0)) not valid;
alter table "public"."board_meeting_agenda_items" validate constraint "valid_sort_order";
alter table "public"."board_meeting_attendees" add constraint "board_meeting_attendees_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_attendees" validate constraint "board_meeting_attendees_meeting_id_fkey";
alter table "public"."board_meeting_attendees" add constraint "board_meeting_attendees_meeting_id_user_id_key" UNIQUE using index "board_meeting_attendees_meeting_id_user_id_key";
alter table "public"."board_meeting_attendees" add constraint "board_meeting_attendees_proxy_for_user_id_fkey" FOREIGN KEY (proxy_for_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_attendees" validate constraint "board_meeting_attendees_proxy_for_user_id_fkey";
alter table "public"."board_meeting_attendees" add constraint "board_meeting_attendees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_attendees" validate constraint "board_meeting_attendees_user_id_fkey";
alter table "public"."board_meeting_attendees" add constraint "valid_attendance_status" CHECK ((attendance_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text, 'attended'::text, 'absent'::text]))) not valid;
alter table "public"."board_meeting_attendees" validate constraint "valid_attendance_status";
alter table "public"."board_meeting_attendees" add constraint "valid_role" CHECK ((role = ANY (ARRAY['member'::text, 'chair'::text, 'secretary'::text, 'treasurer'::text, 'guest'::text, 'advisor'::text]))) not valid;
alter table "public"."board_meeting_attendees" validate constraint "valid_role";
alter table "public"."board_meeting_ballots" add constraint "board_meeting_ballots_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_ballots" validate constraint "board_meeting_ballots_user_id_fkey";
alter table "public"."board_meeting_ballots" add constraint "board_meeting_ballots_vote_id_fkey" FOREIGN KEY (vote_id) REFERENCES public.board_meeting_votes(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_ballots" validate constraint "board_meeting_ballots_vote_id_fkey";
alter table "public"."board_meeting_ballots" add constraint "board_meeting_ballots_vote_id_user_id_key" UNIQUE using index "board_meeting_ballots_vote_id_user_id_key";
alter table "public"."board_meeting_ballots" add constraint "board_meeting_ballots_voted_as_proxy_for_fkey" FOREIGN KEY (voted_as_proxy_for) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_ballots" validate constraint "board_meeting_ballots_voted_as_proxy_for_fkey";
alter table "public"."board_meeting_ballots" add constraint "valid_choice" CHECK ((choice = ANY (ARRAY['for'::text, 'against'::text, 'abstain'::text]))) not valid;
alter table "public"."board_meeting_ballots" validate constraint "valid_choice";
alter table "public"."board_meeting_comments" add constraint "board_meeting_comments_agenda_item_id_fkey" FOREIGN KEY (agenda_item_id) REFERENCES public.board_meeting_agenda_items(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_comments" validate constraint "board_meeting_comments_agenda_item_id_fkey";
alter table "public"."board_meeting_comments" add constraint "board_meeting_comments_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_comments" validate constraint "board_meeting_comments_meeting_id_fkey";
alter table "public"."board_meeting_comments" add constraint "board_meeting_comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.board_meeting_comments(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_comments" validate constraint "board_meeting_comments_parent_comment_id_fkey";
alter table "public"."board_meeting_comments" add constraint "board_meeting_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_comments" validate constraint "board_meeting_comments_user_id_fkey";
alter table "public"."board_meeting_documents" add constraint "board_meeting_documents_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_documents" validate constraint "board_meeting_documents_approved_by_fkey";
alter table "public"."board_meeting_documents" add constraint "board_meeting_documents_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_documents" validate constraint "board_meeting_documents_document_id_fkey";
alter table "public"."board_meeting_documents" add constraint "board_meeting_documents_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_documents" validate constraint "board_meeting_documents_meeting_id_fkey";
alter table "public"."board_meeting_documents" add constraint "valid_document_type" CHECK ((document_type = ANY (ARRAY['board_book'::text, 'minutes'::text, 'resolution'::text, 'financial'::text, 'report'::text, 'attachment'::text]))) not valid;
alter table "public"."board_meeting_documents" validate constraint "valid_document_type";
alter table "public"."board_meeting_templates" add constraint "board_meeting_templates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_templates" validate constraint "board_meeting_templates_company_id_fkey";
alter table "public"."board_meeting_templates" add constraint "board_meeting_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_templates" validate constraint "board_meeting_templates_created_by_fkey";
alter table "public"."board_meeting_templates" add constraint "valid_category" CHECK ((category = ANY (ARRAY['nonprofit'::text, 'corporate'::text, 'advisory'::text, 'hoa'::text, 'custom'::text]))) not valid;
alter table "public"."board_meeting_templates" validate constraint "valid_category";
alter table "public"."board_meeting_views" add constraint "board_meeting_views_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.board_meeting_documents(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_views" validate constraint "board_meeting_views_document_id_fkey";
alter table "public"."board_meeting_views" add constraint "board_meeting_views_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_views" validate constraint "board_meeting_views_meeting_id_fkey";
alter table "public"."board_meeting_views" add constraint "board_meeting_views_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_views" validate constraint "board_meeting_views_user_id_fkey";
alter table "public"."board_meeting_votes" add constraint "board_meeting_votes_agenda_item_id_fkey" FOREIGN KEY (agenda_item_id) REFERENCES public.board_meeting_agenda_items(id) ON DELETE SET NULL not valid;
alter table "public"."board_meeting_votes" validate constraint "board_meeting_votes_agenda_item_id_fkey";
alter table "public"."board_meeting_votes" add constraint "board_meeting_votes_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES public.board_meetings(id) ON DELETE CASCADE not valid;
alter table "public"."board_meeting_votes" validate constraint "board_meeting_votes_meeting_id_fkey";
alter table "public"."board_meeting_votes" add constraint "valid_result" CHECK (((result IS NULL) OR (result = ANY (ARRAY['passed'::text, 'failed'::text, 'tied'::text, 'quorum_not_met'::text])))) not valid;
alter table "public"."board_meeting_votes" validate constraint "valid_result";
alter table "public"."board_meeting_votes" add constraint "valid_threshold" CHECK (((threshold_percentage >= (0)::numeric) AND (threshold_percentage <= (100)::numeric))) not valid;
alter table "public"."board_meeting_votes" validate constraint "valid_threshold";
alter table "public"."board_meeting_votes" add constraint "valid_vote_status" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'closed'::text, 'passed'::text, 'failed'::text]))) not valid;
alter table "public"."board_meeting_votes" validate constraint "valid_vote_status";
alter table "public"."board_meeting_votes" add constraint "valid_vote_type" CHECK ((vote_type = ANY (ARRAY['resolution'::text, 'motion'::text, 'approval'::text, 'election'::text]))) not valid;
alter table "public"."board_meeting_votes" validate constraint "valid_vote_type";
alter table "public"."board_meetings" add constraint "board_meetings_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;
alter table "public"."board_meetings" validate constraint "board_meetings_company_id_fkey";
alter table "public"."board_meetings" add constraint "board_meetings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meetings" validate constraint "board_meetings_created_by_fkey";
alter table "public"."board_meetings" add constraint "board_meetings_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."board_meetings" validate constraint "board_meetings_owner_user_id_fkey";
alter table "public"."board_meetings" add constraint "board_meetings_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;
alter table "public"."board_meetings" validate constraint "board_meetings_project_id_fkey";
alter table "public"."board_meetings" add constraint "fk_board_meetings_template_id" FOREIGN KEY (template_id) REFERENCES public.board_meeting_templates(id) ON DELETE SET NULL not valid;
alter table "public"."board_meetings" validate constraint "fk_board_meetings_template_id";
alter table "public"."board_meetings" add constraint "valid_engagement_score" CHECK (((engagement_score IS NULL) OR ((engagement_score >= (0)::numeric) AND (engagement_score <= (100)::numeric)))) not valid;
alter table "public"."board_meetings" validate constraint "valid_engagement_score";
alter table "public"."board_meetings" add constraint "valid_meeting_type" CHECK ((meeting_type = ANY (ARRAY['regular'::text, 'special'::text, 'annual'::text, 'emergency'::text, 'committee'::text]))) not valid;
alter table "public"."board_meetings" validate constraint "valid_meeting_type";
alter table "public"."board_meetings" add constraint "valid_quorum_percentage" CHECK (((quorum_percentage >= (0)::numeric) AND (quorum_percentage <= (100)::numeric))) not valid;
alter table "public"."board_meetings" validate constraint "valid_quorum_percentage";
alter table "public"."board_meetings" add constraint "valid_status" CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))) not valid;
alter table "public"."board_meetings" validate constraint "valid_status";
alter table "public"."memberships" add constraint "memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID not valid;
alter table "public"."memberships" validate constraint "memberships_user_id_fkey";
alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID not valid;
alter table "public"."profiles" validate constraint "profiles_user_id_fkey";
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.calculate_vote_result(vote_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  vote_record RECORD;
  total_votes INTEGER;
  required_votes INTEGER;
  result_text TEXT;
BEGIN
  -- Get the vote record with current tallies
  SELECT * INTO vote_record
  FROM public.board_meeting_votes
  WHERE id = vote_id_param;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calculate total votes cast (excluding abstentions for threshold calculation)
  total_votes := vote_record.votes_for + vote_record.votes_against;

  -- Check if quorum was met (we need total_eligible_voters to be set)
  IF vote_record.total_eligible_voters IS NOT NULL THEN
    -- Check if enough voters participated
    IF total_votes < (vote_record.total_eligible_voters * vote_record.threshold_percentage / 100.0) THEN
      RETURN 'quorum_not_met';
    END IF;
  END IF;

  -- Check for unanimous requirement
  IF vote_record.requires_unanimous THEN
    IF vote_record.votes_for = vote_record.total_eligible_voters AND vote_record.votes_against = 0 THEN
      RETURN 'passed';
    ELSE
      RETURN 'failed';
    END IF;
  END IF;

  -- Calculate required votes based on threshold
  IF total_votes = 0 THEN
    RETURN 'tied';
  END IF;

  required_votes := CEIL(total_votes * vote_record.threshold_percentage / 100.0);

  -- Determine result
  IF vote_record.votes_for >= required_votes THEN
    result_text := 'passed';
  ELSIF vote_record.votes_against >= required_votes THEN
    result_text := 'failed';
  ELSE
    result_text := 'tied';
  END IF;

  RETURN result_text;
END;
$function$;
CREATE OR REPLACE FUNCTION public.fn_company_member_user_ids(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT m.user_id
  FROM public.memberships m
  WHERE m.company_id IN (SELECT public.fn_user_company_ids(_user_id))
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
$function$;
CREATE OR REPLACE FUNCTION public.fn_user_company_ids(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id 
  FROM public.memberships
  WHERE user_id = _user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
$function$;
CREATE OR REPLACE FUNCTION public.update_board_meeting_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_vote_tallies()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  vote_id_to_update UUID;
BEGIN
  -- Determine which vote to update
  IF TG_OP = 'DELETE' THEN
    vote_id_to_update := OLD.vote_id;
  ELSE
    vote_id_to_update := NEW.vote_id;
  END IF;

  -- Recalculate all tallies for this vote
  UPDATE public.board_meeting_votes
  SET
    votes_for = (SELECT COUNT(*) FROM public.board_meeting_ballots WHERE vote_id = vote_id_to_update AND choice = 'for'),
    votes_against = (SELECT COUNT(*) FROM public.board_meeting_ballots WHERE vote_id = vote_id_to_update AND choice = 'against'),
    votes_abstain = (SELECT COUNT(*) FROM public.board_meeting_ballots WHERE vote_id = vote_id_to_update AND choice = 'abstain')
  WHERE id = vote_id_to_update;

  -- Calculate and update result
  UPDATE public.board_meeting_votes
  SET result = public.calculate_vote_result(vote_id_to_update)
  WHERE id = vote_id_to_update;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (user_id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (user_id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$function$;
grant delete on table "public"."_fk_backup" to "anon";
grant insert on table "public"."_fk_backup" to "anon";
grant references on table "public"."_fk_backup" to "anon";
grant select on table "public"."_fk_backup" to "anon";
grant trigger on table "public"."_fk_backup" to "anon";
grant truncate on table "public"."_fk_backup" to "anon";
grant update on table "public"."_fk_backup" to "anon";
grant delete on table "public"."_fk_backup" to "authenticated";
grant insert on table "public"."_fk_backup" to "authenticated";
grant references on table "public"."_fk_backup" to "authenticated";
grant select on table "public"."_fk_backup" to "authenticated";
grant trigger on table "public"."_fk_backup" to "authenticated";
grant truncate on table "public"."_fk_backup" to "authenticated";
grant update on table "public"."_fk_backup" to "authenticated";
grant delete on table "public"."_fk_backup" to "service_role";
grant insert on table "public"."_fk_backup" to "service_role";
grant references on table "public"."_fk_backup" to "service_role";
grant select on table "public"."_fk_backup" to "service_role";
grant trigger on table "public"."_fk_backup" to "service_role";
grant truncate on table "public"."_fk_backup" to "service_role";
grant update on table "public"."_fk_backup" to "service_role";
grant delete on table "public"."board_meeting_action_items" to "anon";
grant insert on table "public"."board_meeting_action_items" to "anon";
grant references on table "public"."board_meeting_action_items" to "anon";
grant select on table "public"."board_meeting_action_items" to "anon";
grant trigger on table "public"."board_meeting_action_items" to "anon";
grant truncate on table "public"."board_meeting_action_items" to "anon";
grant update on table "public"."board_meeting_action_items" to "anon";
grant delete on table "public"."board_meeting_action_items" to "authenticated";
grant insert on table "public"."board_meeting_action_items" to "authenticated";
grant references on table "public"."board_meeting_action_items" to "authenticated";
grant select on table "public"."board_meeting_action_items" to "authenticated";
grant trigger on table "public"."board_meeting_action_items" to "authenticated";
grant truncate on table "public"."board_meeting_action_items" to "authenticated";
grant update on table "public"."board_meeting_action_items" to "authenticated";
grant delete on table "public"."board_meeting_action_items" to "service_role";
grant insert on table "public"."board_meeting_action_items" to "service_role";
grant references on table "public"."board_meeting_action_items" to "service_role";
grant select on table "public"."board_meeting_action_items" to "service_role";
grant trigger on table "public"."board_meeting_action_items" to "service_role";
grant truncate on table "public"."board_meeting_action_items" to "service_role";
grant update on table "public"."board_meeting_action_items" to "service_role";
grant delete on table "public"."board_meeting_agenda_items" to "anon";
grant insert on table "public"."board_meeting_agenda_items" to "anon";
grant references on table "public"."board_meeting_agenda_items" to "anon";
grant select on table "public"."board_meeting_agenda_items" to "anon";
grant trigger on table "public"."board_meeting_agenda_items" to "anon";
grant truncate on table "public"."board_meeting_agenda_items" to "anon";
grant update on table "public"."board_meeting_agenda_items" to "anon";
grant delete on table "public"."board_meeting_agenda_items" to "authenticated";
grant insert on table "public"."board_meeting_agenda_items" to "authenticated";
grant references on table "public"."board_meeting_agenda_items" to "authenticated";
grant select on table "public"."board_meeting_agenda_items" to "authenticated";
grant trigger on table "public"."board_meeting_agenda_items" to "authenticated";
grant truncate on table "public"."board_meeting_agenda_items" to "authenticated";
grant update on table "public"."board_meeting_agenda_items" to "authenticated";
grant delete on table "public"."board_meeting_agenda_items" to "service_role";
grant insert on table "public"."board_meeting_agenda_items" to "service_role";
grant references on table "public"."board_meeting_agenda_items" to "service_role";
grant select on table "public"."board_meeting_agenda_items" to "service_role";
grant trigger on table "public"."board_meeting_agenda_items" to "service_role";
grant truncate on table "public"."board_meeting_agenda_items" to "service_role";
grant update on table "public"."board_meeting_agenda_items" to "service_role";
grant delete on table "public"."board_meeting_attendees" to "anon";
grant insert on table "public"."board_meeting_attendees" to "anon";
grant references on table "public"."board_meeting_attendees" to "anon";
grant select on table "public"."board_meeting_attendees" to "anon";
grant trigger on table "public"."board_meeting_attendees" to "anon";
grant truncate on table "public"."board_meeting_attendees" to "anon";
grant update on table "public"."board_meeting_attendees" to "anon";
grant delete on table "public"."board_meeting_attendees" to "authenticated";
grant insert on table "public"."board_meeting_attendees" to "authenticated";
grant references on table "public"."board_meeting_attendees" to "authenticated";
grant select on table "public"."board_meeting_attendees" to "authenticated";
grant trigger on table "public"."board_meeting_attendees" to "authenticated";
grant truncate on table "public"."board_meeting_attendees" to "authenticated";
grant update on table "public"."board_meeting_attendees" to "authenticated";
grant delete on table "public"."board_meeting_attendees" to "service_role";
grant insert on table "public"."board_meeting_attendees" to "service_role";
grant references on table "public"."board_meeting_attendees" to "service_role";
grant select on table "public"."board_meeting_attendees" to "service_role";
grant trigger on table "public"."board_meeting_attendees" to "service_role";
grant truncate on table "public"."board_meeting_attendees" to "service_role";
grant update on table "public"."board_meeting_attendees" to "service_role";
grant delete on table "public"."board_meeting_ballots" to "anon";
grant insert on table "public"."board_meeting_ballots" to "anon";
grant references on table "public"."board_meeting_ballots" to "anon";
grant select on table "public"."board_meeting_ballots" to "anon";
grant trigger on table "public"."board_meeting_ballots" to "anon";
grant truncate on table "public"."board_meeting_ballots" to "anon";
grant update on table "public"."board_meeting_ballots" to "anon";
grant delete on table "public"."board_meeting_ballots" to "authenticated";
grant insert on table "public"."board_meeting_ballots" to "authenticated";
grant references on table "public"."board_meeting_ballots" to "authenticated";
grant select on table "public"."board_meeting_ballots" to "authenticated";
grant trigger on table "public"."board_meeting_ballots" to "authenticated";
grant truncate on table "public"."board_meeting_ballots" to "authenticated";
grant update on table "public"."board_meeting_ballots" to "authenticated";
grant delete on table "public"."board_meeting_ballots" to "service_role";
grant insert on table "public"."board_meeting_ballots" to "service_role";
grant references on table "public"."board_meeting_ballots" to "service_role";
grant select on table "public"."board_meeting_ballots" to "service_role";
grant trigger on table "public"."board_meeting_ballots" to "service_role";
grant truncate on table "public"."board_meeting_ballots" to "service_role";
grant update on table "public"."board_meeting_ballots" to "service_role";
grant delete on table "public"."board_meeting_comments" to "anon";
grant insert on table "public"."board_meeting_comments" to "anon";
grant references on table "public"."board_meeting_comments" to "anon";
grant select on table "public"."board_meeting_comments" to "anon";
grant trigger on table "public"."board_meeting_comments" to "anon";
grant truncate on table "public"."board_meeting_comments" to "anon";
grant update on table "public"."board_meeting_comments" to "anon";
grant delete on table "public"."board_meeting_comments" to "authenticated";
grant insert on table "public"."board_meeting_comments" to "authenticated";
grant references on table "public"."board_meeting_comments" to "authenticated";
grant select on table "public"."board_meeting_comments" to "authenticated";
grant trigger on table "public"."board_meeting_comments" to "authenticated";
grant truncate on table "public"."board_meeting_comments" to "authenticated";
grant update on table "public"."board_meeting_comments" to "authenticated";
grant delete on table "public"."board_meeting_comments" to "service_role";
grant insert on table "public"."board_meeting_comments" to "service_role";
grant references on table "public"."board_meeting_comments" to "service_role";
grant select on table "public"."board_meeting_comments" to "service_role";
grant trigger on table "public"."board_meeting_comments" to "service_role";
grant truncate on table "public"."board_meeting_comments" to "service_role";
grant update on table "public"."board_meeting_comments" to "service_role";
grant delete on table "public"."board_meeting_documents" to "anon";
grant insert on table "public"."board_meeting_documents" to "anon";
grant references on table "public"."board_meeting_documents" to "anon";
grant select on table "public"."board_meeting_documents" to "anon";
grant trigger on table "public"."board_meeting_documents" to "anon";
grant truncate on table "public"."board_meeting_documents" to "anon";
grant update on table "public"."board_meeting_documents" to "anon";
grant delete on table "public"."board_meeting_documents" to "authenticated";
grant insert on table "public"."board_meeting_documents" to "authenticated";
grant references on table "public"."board_meeting_documents" to "authenticated";
grant select on table "public"."board_meeting_documents" to "authenticated";
grant trigger on table "public"."board_meeting_documents" to "authenticated";
grant truncate on table "public"."board_meeting_documents" to "authenticated";
grant update on table "public"."board_meeting_documents" to "authenticated";
grant delete on table "public"."board_meeting_documents" to "service_role";
grant insert on table "public"."board_meeting_documents" to "service_role";
grant references on table "public"."board_meeting_documents" to "service_role";
grant select on table "public"."board_meeting_documents" to "service_role";
grant trigger on table "public"."board_meeting_documents" to "service_role";
grant truncate on table "public"."board_meeting_documents" to "service_role";
grant update on table "public"."board_meeting_documents" to "service_role";
grant delete on table "public"."board_meeting_templates" to "anon";
grant insert on table "public"."board_meeting_templates" to "anon";
grant references on table "public"."board_meeting_templates" to "anon";
grant select on table "public"."board_meeting_templates" to "anon";
grant trigger on table "public"."board_meeting_templates" to "anon";
grant truncate on table "public"."board_meeting_templates" to "anon";
grant update on table "public"."board_meeting_templates" to "anon";
grant delete on table "public"."board_meeting_templates" to "authenticated";
grant insert on table "public"."board_meeting_templates" to "authenticated";
grant references on table "public"."board_meeting_templates" to "authenticated";
grant select on table "public"."board_meeting_templates" to "authenticated";
grant trigger on table "public"."board_meeting_templates" to "authenticated";
grant truncate on table "public"."board_meeting_templates" to "authenticated";
grant update on table "public"."board_meeting_templates" to "authenticated";
grant delete on table "public"."board_meeting_templates" to "service_role";
grant insert on table "public"."board_meeting_templates" to "service_role";
grant references on table "public"."board_meeting_templates" to "service_role";
grant select on table "public"."board_meeting_templates" to "service_role";
grant trigger on table "public"."board_meeting_templates" to "service_role";
grant truncate on table "public"."board_meeting_templates" to "service_role";
grant update on table "public"."board_meeting_templates" to "service_role";
grant delete on table "public"."board_meeting_views" to "anon";
grant insert on table "public"."board_meeting_views" to "anon";
grant references on table "public"."board_meeting_views" to "anon";
grant select on table "public"."board_meeting_views" to "anon";
grant trigger on table "public"."board_meeting_views" to "anon";
grant truncate on table "public"."board_meeting_views" to "anon";
grant update on table "public"."board_meeting_views" to "anon";
grant delete on table "public"."board_meeting_views" to "authenticated";
grant insert on table "public"."board_meeting_views" to "authenticated";
grant references on table "public"."board_meeting_views" to "authenticated";
grant select on table "public"."board_meeting_views" to "authenticated";
grant trigger on table "public"."board_meeting_views" to "authenticated";
grant truncate on table "public"."board_meeting_views" to "authenticated";
grant update on table "public"."board_meeting_views" to "authenticated";
grant delete on table "public"."board_meeting_views" to "service_role";
grant insert on table "public"."board_meeting_views" to "service_role";
grant references on table "public"."board_meeting_views" to "service_role";
grant select on table "public"."board_meeting_views" to "service_role";
grant trigger on table "public"."board_meeting_views" to "service_role";
grant truncate on table "public"."board_meeting_views" to "service_role";
grant update on table "public"."board_meeting_views" to "service_role";
grant delete on table "public"."board_meeting_votes" to "anon";
grant insert on table "public"."board_meeting_votes" to "anon";
grant references on table "public"."board_meeting_votes" to "anon";
grant select on table "public"."board_meeting_votes" to "anon";
grant trigger on table "public"."board_meeting_votes" to "anon";
grant truncate on table "public"."board_meeting_votes" to "anon";
grant update on table "public"."board_meeting_votes" to "anon";
grant delete on table "public"."board_meeting_votes" to "authenticated";
grant insert on table "public"."board_meeting_votes" to "authenticated";
grant references on table "public"."board_meeting_votes" to "authenticated";
grant select on table "public"."board_meeting_votes" to "authenticated";
grant trigger on table "public"."board_meeting_votes" to "authenticated";
grant truncate on table "public"."board_meeting_votes" to "authenticated";
grant update on table "public"."board_meeting_votes" to "authenticated";
grant delete on table "public"."board_meeting_votes" to "service_role";
grant insert on table "public"."board_meeting_votes" to "service_role";
grant references on table "public"."board_meeting_votes" to "service_role";
grant select on table "public"."board_meeting_votes" to "service_role";
grant trigger on table "public"."board_meeting_votes" to "service_role";
grant truncate on table "public"."board_meeting_votes" to "service_role";
grant update on table "public"."board_meeting_votes" to "service_role";
grant delete on table "public"."board_meetings" to "anon";
grant insert on table "public"."board_meetings" to "anon";
grant references on table "public"."board_meetings" to "anon";
grant select on table "public"."board_meetings" to "anon";
grant trigger on table "public"."board_meetings" to "anon";
grant truncate on table "public"."board_meetings" to "anon";
grant update on table "public"."board_meetings" to "anon";
grant delete on table "public"."board_meetings" to "authenticated";
grant insert on table "public"."board_meetings" to "authenticated";
grant references on table "public"."board_meetings" to "authenticated";
grant select on table "public"."board_meetings" to "authenticated";
grant trigger on table "public"."board_meetings" to "authenticated";
grant truncate on table "public"."board_meetings" to "authenticated";
grant update on table "public"."board_meetings" to "authenticated";
grant delete on table "public"."board_meetings" to "service_role";
grant insert on table "public"."board_meetings" to "service_role";
grant references on table "public"."board_meetings" to "service_role";
grant select on table "public"."board_meetings" to "service_role";
grant trigger on table "public"."board_meetings" to "service_role";
grant truncate on table "public"."board_meetings" to "service_role";
grant update on table "public"."board_meetings" to "service_role";
create policy "Users can create action items for meetings in their companies"
  on "public"."board_meeting_action_items"
  as permissive
  for insert
  to public
with check ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can delete action items from meetings in their companies"
  on "public"."board_meeting_action_items"
  as permissive
  for delete
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can update action items for meetings in their companies"
  on "public"."board_meeting_action_items"
  as permissive
  for update
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can view action items for meetings in their companies"
  on "public"."board_meeting_action_items"
  as permissive
  for select
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can add agenda items to meetings in their companies"
  on "public"."board_meeting_agenda_items"
  as permissive
  for insert
  to public
with check ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can delete agenda items from meetings in their companies"
  on "public"."board_meeting_agenda_items"
  as permissive
  for delete
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can update agenda items for meetings in their companies"
  on "public"."board_meeting_agenda_items"
  as permissive
  for update
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can view agenda items for meetings in their companies"
  on "public"."board_meeting_agenda_items"
  as permissive
  for select
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can add attendees to meetings in their companies"
  on "public"."board_meeting_attendees"
  as permissive
  for insert
  to public
with check ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can remove attendees from meetings in their companies"
  on "public"."board_meeting_attendees"
  as permissive
  for delete
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can update attendees for meetings in their companies"
  on "public"."board_meeting_attendees"
  as permissive
  for update
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can view attendees for meetings in their companies"
  on "public"."board_meeting_attendees"
  as permissive
  for select
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can cast their own ballots"
  on "public"."board_meeting_ballots"
  as permissive
  for insert
  to public
with check (((user_id = auth.uid()) AND (vote_id IN ( SELECT v.id
   FROM (public.board_meeting_votes v
     JOIN public.board_meetings m ON ((v.meeting_id = m.id)))
  WHERE (m.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text))))))));
create policy "Users can delete their own ballots for active votes"
  on "public"."board_meeting_ballots"
  as permissive
  for delete
  to public
using (((user_id = auth.uid()) AND (vote_id IN ( SELECT board_meeting_votes.id
   FROM public.board_meeting_votes
  WHERE (board_meeting_votes.status = ANY (ARRAY['pending'::text, 'active'::text]))))));
create policy "Users can update their own ballots for active votes"
  on "public"."board_meeting_ballots"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) AND (vote_id IN ( SELECT board_meeting_votes.id
   FROM public.board_meeting_votes
  WHERE (board_meeting_votes.status = ANY (ARRAY['pending'::text, 'active'::text]))))));
create policy "Users can view ballots for non-secret votes in their companies"
  on "public"."board_meeting_ballots"
  as permissive
  for select
  to public
using ((vote_id IN ( SELECT v.id
   FROM (public.board_meeting_votes v
     JOIN public.board_meetings m ON ((v.meeting_id = m.id)))
  WHERE ((m.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))) AND (v.is_secret_ballot = false)))));
create policy "Users can view their own ballots"
  on "public"."board_meeting_ballots"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));
create policy "Users can add comments to meetings in their companies"
  on "public"."board_meeting_comments"
  as permissive
  for insert
  to public
with check ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can delete their own comments"
  on "public"."board_meeting_comments"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));
create policy "Users can update their own comments"
  on "public"."board_meeting_comments"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));
create policy "Users can view comments for meetings in their companies"
  on "public"."board_meeting_comments"
  as permissive
  for select
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can add documents to meetings in their companies"
  on "public"."board_meeting_documents"
  as permissive
  for insert
  to public
with check ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can delete documents from meetings in their companies"
  on "public"."board_meeting_documents"
  as permissive
  for delete
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can update documents for meetings in their companies"
  on "public"."board_meeting_documents"
  as permissive
  for update
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can view documents for meetings in their companies"
  on "public"."board_meeting_documents"
  as permissive
  for select
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can create templates in their companies"
  on "public"."board_meeting_templates"
  as permissive
  for insert
  to public
with check (((company_id IN ( SELECT memberships.company_id
   FROM public.memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))) OR (company_id IS NULL)));
create policy "Users can delete templates they created"
  on "public"."board_meeting_templates"
  as permissive
  for delete
  to public
using ((created_by = auth.uid()));
create policy "Users can update templates they created or in their companies"
  on "public"."board_meeting_templates"
  as permissive
  for update
  to public
using (((created_by = auth.uid()) OR (company_id IN ( SELECT memberships.company_id
   FROM public.memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text))))));
create policy "Users can view public and system templates"
  on "public"."board_meeting_templates"
  as permissive
  for select
  to public
using (((is_public = true) OR (is_system_template = true)));
create policy "Users can view templates in their companies"
  on "public"."board_meeting_templates"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT memberships.company_id
   FROM public.memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))));
create policy "Users can create view records"
  on "public"."board_meeting_views"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));
create policy "Users can view their own view records"
  on "public"."board_meeting_views"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));
create policy "Users can create votes for meetings in their companies"
  on "public"."board_meeting_votes"
  as permissive
  for insert
  to public
with check ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can delete votes for meetings in their companies"
  on "public"."board_meeting_votes"
  as permissive
  for delete
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can update votes for meetings in their companies"
  on "public"."board_meeting_votes"
  as permissive
  for update
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can view votes for meetings in their companies"
  on "public"."board_meeting_votes"
  as permissive
  for select
  to public
using ((meeting_id IN ( SELECT board_meetings.id
   FROM public.board_meetings
  WHERE (board_meetings.company_id IN ( SELECT memberships.company_id
           FROM public.memberships
          WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))))));
create policy "Users can create meetings in their companies"
  on "public"."board_meetings"
  as permissive
  for insert
  to public
with check ((company_id IN ( SELECT memberships.company_id
   FROM public.memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))));
create policy "Users can delete meetings in their companies"
  on "public"."board_meetings"
  as permissive
  for delete
  to public
using ((company_id IN ( SELECT memberships.company_id
   FROM public.memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))));
create policy "Users can update meetings in their companies"
  on "public"."board_meetings"
  as permissive
  for update
  to public
using ((company_id IN ( SELECT memberships.company_id
   FROM public.memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))));
create policy "Users can view meetings in their companies"
  on "public"."board_meetings"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT memberships.company_id
   FROM public.memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'active'::text)))));
create policy "memberships_select_company_members"
  on "public"."memberships"
  as permissive
  for select
  to authenticated
using (((company_id IN ( SELECT public.fn_user_company_ids(auth.uid()) AS fn_user_company_ids)) OR public.is_site_admin(( SELECT c.site_id
   FROM public.companies c
  WHERE (c.id = memberships.company_id)))));
create policy "Members can view notes"
  on "public"."notes"
  as permissive
  for select
  to public
using (public.is_company_member(company_id));
create policy "profiles: company members can read each other"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.memberships m_me
     JOIN public.memberships m_them ON (((m_them.user_id = profiles.user_id) AND (m_them.company_id = m_me.company_id) AND (m_them.status = 'active'::text))))
  WHERE ((m_me.user_id = auth.uid()) AND (m_me.status = 'active'::text)))));
create policy "profiles_select_company_members"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR (user_id IN ( SELECT public.fn_company_member_user_ids(auth.uid()) AS fn_company_member_user_ids)) OR (EXISTS ( SELECT 1
   FROM public.site_memberships sm
  WHERE ((sm.user_id = auth.uid()) AND (sm.role = ANY (ARRAY['super_admin'::public.site_role, 'site_admin'::public.site_role])))))));
create policy "Members can view tasks"
  on "public"."tasks"
  as permissive
  for select
  to public
using (public.is_company_member(company_id));
CREATE TRIGGER update_board_meeting_action_items_updated_at BEFORE UPDATE ON public.board_meeting_action_items FOR EACH ROW EXECUTE FUNCTION public.update_board_meeting_updated_at();
CREATE TRIGGER update_board_meeting_agenda_items_updated_at BEFORE UPDATE ON public.board_meeting_agenda_items FOR EACH ROW EXECUTE FUNCTION public.update_board_meeting_updated_at();
CREATE TRIGGER update_vote_tallies_on_ballot_change AFTER INSERT OR DELETE OR UPDATE ON public.board_meeting_ballots FOR EACH ROW EXECUTE FUNCTION public.update_vote_tallies();
CREATE TRIGGER update_board_meeting_comments_updated_at BEFORE UPDATE ON public.board_meeting_comments FOR EACH ROW EXECUTE FUNCTION public.update_board_meeting_updated_at();
CREATE TRIGGER update_board_meeting_documents_updated_at BEFORE UPDATE ON public.board_meeting_documents FOR EACH ROW EXECUTE FUNCTION public.update_board_meeting_updated_at();
CREATE TRIGGER update_board_meeting_templates_updated_at BEFORE UPDATE ON public.board_meeting_templates FOR EACH ROW EXECUTE FUNCTION public.update_board_meeting_updated_at();
CREATE TRIGGER update_board_meeting_votes_updated_at BEFORE UPDATE ON public.board_meeting_votes FOR EACH ROW EXECUTE FUNCTION public.update_board_meeting_updated_at();
CREATE TRIGGER update_board_meetings_updated_at BEFORE UPDATE ON public.board_meetings FOR EACH ROW EXECUTE FUNCTION public.update_board_meeting_updated_at();
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
