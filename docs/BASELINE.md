# Baseline Checkpoint v0.9.0-beta

**Date:** 2026-01-16  
**Version:** 0.9.0-beta

---

## Overview

This document serves as a safe checkpoint for the application. All core modules and infrastructure are implemented and functional.

---

## Modules Enabled

| Module | Status | Description |
|--------|--------|-------------|
| Tasks | ✅ Active | Task management with recurrence, templates, and project linking |
| Projects | ✅ Active | Project management with phases, templates, and team collaboration |
| Calendar | ✅ Active | Event scheduling with recurrence and project integration |
| Notes | ✅ Active | Note-taking with folders, tags, and project linking |
| Documents | ✅ Active | Document management with folders and file storage |
| Groups | ✅ Active | Team/group organization within companies |
| Locations | ✅ Active | Physical location management for companies |

---

## Core Features Implemented

### Multi-Tenancy
- Sites → Companies → Users hierarchy
- Company-scoped data isolation via RLS
- Membership roles: `super_admin`, `site_admin`, `company_admin`, `location_admin`, `module_admin`, `user`, `external`

### Authentication
- Email/password authentication
- Auto-confirm email enabled for development
- Profile management with active company/location tracking

### Module System
- Company-level module enable/disable
- UI guards for disabled modules
- Data preserved when modules are disabled

### Templates System
- Project templates with phases and tasks
- Task templates with recurrence support
- Note and document templates
- "Create from template" workflows

### Recurrence
- Tasks: Full recurrence with exceptions, overrides, completions
- Events: Full recurrence with exceptions and overrides
- RRule-based recurrence rules

### Universal Linking
- Entity links between projects, tasks, notes, documents, events
- Bidirectional link display on detail pages

### Audit Logging
- Company-scoped audit trail
- Action tracking for create/update/delete operations

---

## Known Deferred Items

| Item | Status | Notes |
|------|--------|-------|
| Email invite flow | ⏳ Pending Test | Edge function deployed, needs live testing |
| Leaked password protection | ⚠️ Warning | Supabase setting - consider enabling in production |
| Production email templates | 📝 TODO | Customize for branding |

---

## Required Secrets

The following secrets are configured (values are encrypted):

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Email delivery via Resend |
| `EMAIL_FROM` | Sender email address |
| `APP_URL` | Application base URL for email links |

---

## Database Tables

### Core Infrastructure
- `sites` - Multi-site support
- `companies` - Organization containers
- `profiles` - User profile data
- `memberships` - User-company relationships
- `site_memberships` - Site admin assignments
- `modules` - Available system modules
- `company_modules` - Company module activations
- `audit_logs` - Activity tracking

### Business Domain
- `projects` - Project records
- `project_phases` - Project phase definitions
- `project_members` - Project team assignments
- `project_templates` - Project template definitions
- `project_template_phases` - Template phase definitions
- `project_template_tasks` - Template task definitions
- `project_phase_templates` - Legacy phase templates
- `tasks` - Task records with recurrence
- `task_assignees` - Task assignments
- `task_documents` - Task-document links
- `task_occurrence_completions` - Recurring task completions
- `task_recurrence_exceptions` - Skipped occurrences
- `task_recurrence_overrides` - Modified occurrences
- `events` - Calendar events with recurrence
- `event_attendees` - Event participants
- `event_documents` - Event-document links
- `event_recurrence_exceptions` - Skipped events
- `event_recurrence_overrides` - Modified events
- `notes` - Note records
- `documents` - Document records
- `folders` - Folder hierarchy
- `groups` - Team/group definitions
- `group_members` - Group memberships
- `locations` - Physical locations
- `location_members` - Location assignments
- `employees` - Employee records
- `employee_invites` - Pending invitations
- `templates` - Generic template storage
- `entity_links` - Universal linking
- `entity_acl` - Access control lists

---

## RLS Policy Summary

All tables enforce Row Level Security with:
- Company-scoped isolation via `is_company_member()` and `is_company_admin()`
- Module-aware policies via `is_module_enabled()`
- Owner-based write permissions
- Site admin bypass for administrative tables

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **State:** TanStack Query v5
- **Routing:** React Router v6
- **Backend:** Lovable Cloud (Supabase)
- **Auth:** Supabase Auth
- **Database:** PostgreSQL with RLS
- **Edge Functions:** Deno runtime

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.9.0-beta | 2026-01-16 | Initial baseline checkpoint |
