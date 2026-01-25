# Blast Radius Retrofit Notes

## Overview

This document captures the implementation of the Module Registry + Feature Flags system for blast radius reduction.

**Date:** 2026-01-23  
**Related:** `docs/ARCHITECTURE_REPORT.md`

---

## Components Implemented

### 1. Database Layer

**Table:** `public.feature_flags`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK to companies |
| module_id | text | Module identifier from registry |
| enabled | boolean | Whether module is enabled |
| updated_at | timestamptz | Auto-updated on change |
| updated_by | uuid | FK to auth.users |

**RLS Policies:**
- SELECT: Any authenticated user with active membership in the company
- INSERT/UPDATE/DELETE: Only users with `company_admin` role

### 2. Module Registry

**File:** `src/core/modules/moduleRegistry.ts`

Defines all modules with:
- `id`: Unique identifier
- `name`: Display name
- `routePrefix`: URL prefix for routing
- `isCore`: If true, cannot be disabled
- `defaultEnabled`: Default state when no flag exists

**Core Modules (always enabled):**
- core, tasks, projects, calendar, notes, docs, groups, locations, admin

**Optional Modules (toggleable):**
- crm, contacts, forms, workflows, announcements, finance, reports, lms, coaching

### 3. Feature Flags Hook

**File:** `src/core/modules/useCompanyModuleFlags.ts`

- Loads flags from Supabase for active company
- Caches for 5 minutes (React Query staleTime)
- **SAFE MODE**: If flags fail to load, only core modules are enabled
- Provides `isModuleEnabled(moduleId)` check
- Provides `toggleModule(moduleId, enabled)` mutation

### 4. Route Guard

**File:** `src/core/modules/ModuleFlagGuard.tsx`

- Wraps module routes
- Shows loading skeleton while flags load
- Shows `ModuleDisabledPage` if module is disabled
- Graceful fallback in safe mode

### 5. Admin UI

**File:** `src/core/modules/FeatureFlagsPanel.tsx`

- Lists all modules with toggle switches
- Core modules shown as locked (cannot disable)
- Shows pending state during toggle
- Displays helpful info about data preservation

---

## Manual Test Checklist

### Setup
- [ ] Login as a `company_admin` user
- [ ] Navigate to Company Admin → Modules panel

### Feature Flags Admin UI
- [ ] Core modules show "Core" badge and no toggle switch
- [ ] Optional modules show toggle switch
- [ ] Toggling a module updates UI immediately
- [ ] Toast notification confirms change
- [ ] Refresh page: toggle state persists

### Navigation Enforcement
- [ ] Disabled module is hidden from sidebar navigation
- [ ] Enabled module appears in sidebar

### Route Guard Enforcement
- [ ] Directly access disabled module URL (e.g., `/app/crm`)
- [ ] Should see "Module Disabled" page, not crash
- [ ] "Go to Dashboard" button works
- [ ] "Manage Modules" button appears for admins

### Safe Mode
- [ ] Simulate Supabase failure (e.g., network block)
- [ ] App should still load with core modules only
- [ ] Non-core modules should be inaccessible

### Role Enforcement
- [ ] Login as non-admin member
- [ ] Navigate to Modules panel (should not see toggles or be redirected)
- [ ] Disabled modules should be hidden for this user too

### Data Preservation
- [ ] Create data in a module (e.g., CRM client)
- [ ] Disable the module
- [ ] Re-enable the module
- [ ] Verify data still exists

---

## Files Changed

### New Files
- `src/core/modules/moduleRegistry.ts` - Module definitions and helper functions
- `src/core/modules/useCompanyModuleFlags.ts` - Feature flags hook with caching
- `src/core/modules/ModuleFlagGuard.tsx` - Route guard component
- `src/core/modules/ModuleDisabledPage.tsx` - Friendly disabled module page
- `src/core/modules/FeatureFlagsPanel.tsx` - Admin UI for toggling modules
- `src/core/modules/index.ts` - Public API exports

### Modified Files
- `src/components/layout/AppSidebar.tsx` - Uses both legacy and new flag systems for nav filtering
- `src/components/ModuleGuard.tsx` - Enhanced to check feature_flags in addition to company_modules
- `src/pages/app/admin/CompanyConsolePage.tsx` - Added FeatureFlagsPanel to modules section

### Database
- Migration: `feature_flags` table with RLS + auto-update trigger

### New Files
- `src/core/modules/moduleRegistry.ts`
- `src/core/modules/useCompanyModuleFlags.ts`
- `src/core/modules/ModuleFlagGuard.tsx`
- `src/core/modules/ModuleDisabledPage.tsx`
- `src/core/modules/FeatureFlagsPanel.tsx`
- `src/core/modules/index.ts`

### Modified Files
- `src/components/layout/AppSidebar.tsx` - Uses module flags for nav filtering
- `src/pages/app/admin/company-console/ModulesPanel.tsx` - Replaced with FeatureFlagsPanel

### Database
- Migration: `feature_flags` table + RLS + trigger

---

## Integration Points

### With Existing ModuleGuard

The existing `ModuleGuard.tsx` checks the `company_modules` table (legacy system). The new `ModuleFlagGuard` wraps route components and checks `feature_flags`.

**Recommendation:** Eventually consolidate to a single system, but both can coexist during transition.

### With Navigation Config

`navigationConfig.ts` defines nav structure. The sidebar now filters items using:
1. Legacy `useCompanyModules` (for moduleKey-based filtering)
2. New `useCompanyModuleFlags` (for feature flag-based filtering)

---

## Future Improvements

1. **Consolidate module systems**: Merge `company_modules` and `feature_flags` into one source of truth
2. **Audit logging**: Log all flag changes to `audit_logs` table
3. **Bulk operations**: Allow enabling/disabling multiple modules at once
4. **Default flag seeding**: Auto-create flag rows for new companies
5. **Environment-scoped flags**: Different flags for staging vs production

---

## Rollback

To disable this feature:
1. Remove `ModuleFlagGuard` wrappers from routes
2. Remove sidebar flag filtering
3. Keep or drop `feature_flags` table (data is preserved either way)
