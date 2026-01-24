# Seed Data Reference

**Version:** 0.9.0-beta  
**Generated:** 2026-01-16

---

## Overview

This document describes the seed data structure for bootstrapping new environments.
**Note:** No sensitive user data is included. Only structural/reference data.

---

## Sites

```sql
-- Default site (created via bootstrap_first_site RPC)
INSERT INTO sites (name, status, subdomain) VALUES
  ('Default Site', 'active', 'default');
```

---

## Modules

```sql
-- Core modules available in the system
INSERT INTO modules (name, slug, description, category, is_public, version) VALUES
  ('Tasks', 'tasks', 'Task management with recurrence and templates', 'productivity', true, '1.0.0'),
  ('Projects', 'projects', 'Project management with phases and team collaboration', 'productivity', true, '1.0.0'),
  ('Calendar', 'calendar', 'Event scheduling and calendar management', 'productivity', true, '1.0.0'),
  ('Notes', 'notes', 'Note-taking and documentation', 'productivity', true, '1.0.0'),
  ('Documents', 'documents', 'Document storage and management', 'productivity', true, '1.0.0'),
  ('Groups', 'groups', 'Team and group organization', 'organization', true, '1.0.0'),
  ('Locations', 'locations', 'Physical location management', 'organization', true, '1.0.0');
```

---

## Membership Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `company_admin` | Full company access | All CRUD, manage members, manage modules |
| `location_admin` | Location-level admin | Manage assigned location members |
| `module_admin` | Module-level admin | Manage specific module settings |
| `user` | Standard user | Read/write own data, read shared data |
| `external` | External collaborator | Limited read access |

---

## Site Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | Platform owner | All access across all sites |
| `site_admin` | Site administrator | Manage companies within site |

---

## Default Company Modules

When a new company is created, these modules should be enabled by default:

```sql
-- Enable default modules for new company
INSERT INTO company_modules (company_id, module_id, status, granted_at)
SELECT 
  NEW.id,
  m.id,
  'active',
  now()
FROM modules m
WHERE m.slug IN ('tasks', 'projects', 'calendar', 'notes', 'documents');
```

---

## Bootstrap Sequence

1. Create site (or use `get_default_site_id()`)
2. Create company under site
3. Create first user profile
4. Create site_membership for super_admin
5. Create membership for company_admin
6. Enable default modules via company_modules

The `bootstrap_first_site` RPC function handles this automatically for new installations.

---

## Environment-Specific Data

### Development
- Auto-confirm emails enabled
- Dev tools visible in sidebar
- Sample data can be generated

### Production
- Email confirmation required (recommended)
- Dev tools hidden
- Leaked password protection enabled (recommended)

---

## Required Environment Secrets

| Secret | Purpose | Example |
|--------|---------|---------|
| `RESEND_API_KEY` | Email delivery | `re_xxxxxxxx` |
| `EMAIL_FROM` | Sender address | `noreply@yourdomain.com` |
| `APP_URL` | Base URL for links | `https://yourdomain.com` |
