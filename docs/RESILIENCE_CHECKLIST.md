# Resilience Checklist

## Overview

This document provides step-by-step validation for the failure containment and error boundary system.

**Date:** 2026-01-23  
**Related:** `docs/ARCHITECTURE_REPORT.md`, `docs/BLAST_RADIUS_RETROFIT_NOTES.md`

---

## Components Implemented

### Error Boundaries
- **Global**: `src/core/errors/AppErrorBoundary.tsx` - Catches root-level crashes
- **Module**: `src/core/errors/ModuleErrorBoundary.tsx` - Catches per-page errors

### Safe Mode
- **Shell**: `src/core/errors/SafeModeShell.tsx` - Minimal UI when providers fail
- **Flags**: `useCompanyModuleFlags` enters safe mode if load fails

### Diagnostics
- **Health Page**: `/app/health` - System connectivity status
- **Logging**: `src/core/errors/logging.ts` - Safe error logging with redaction

---

## Manual Test Checklist

### 1. Health Page Verification

**Steps:**
1. Login as any user
2. Navigate to `/app/health`

**Expected:**
- [ ] Page loads without error
- [ ] "Database Connection" shows **Pass** with latency
- [ ] "Authentication" shows **Pass** with truncated email
- [ ] "Memberships" shows **Pass** with count
- [ ] "Module Flags" shows **Pass** or **Warning** (if safe mode)
- [ ] "Refresh" button triggers re-check
- [ ] "Safe Mode" badge shows "Inactive" under normal conditions

---

### 2. Global Error Boundary Test

**Steps:**
1. Temporarily break a root component (e.g., add `throw new Error("test")` in `App.tsx` after providers)
2. Reload the app

**Expected:**
- [ ] "Something went wrong" fallback UI appears
- [ ] Error Reference ID is displayed (8-character code)
- [ ] "Reload Page" button reloads the page
- [ ] "Go to Dashboard" button navigates to `/app`
- [ ] Copy button copies error ID to clipboard
- [ ] Console shows `🚨 Error [ID]` with redacted stack trace

**Cleanup:**
- Remove the test error

---

### 3. Module Error Boundary Test

**Steps:**
1. Navigate to any module page (e.g., `/app/tasks`)
2. Open browser DevTools → Sources → find the module component
3. Add a breakpoint and modify to throw an error, OR
4. Temporarily add `throw new Error("test")` to the module component
5. Trigger the error

**Expected:**
- [ ] Sidebar and topbar remain visible and functional
- [ ] Module area shows "Module Error" card
- [ ] Error Reference ID is displayed
- [ ] Current route is shown in monospace
- [ ] "Try Again" button attempts to re-render the module
- [ ] "Go Back" button navigates to previous page
- [ ] "Dashboard" button navigates to `/app`
- [ ] Other modules (e.g., `/app/projects`) still work

**Cleanup:**
- Remove the test error

---

### 4. Safe Mode Test (Membership Failure)

**Steps:**
1. Simulate membership load failure:
   - Block network requests to Supabase (DevTools → Network → Block URL pattern `*supabase*`)
   - OR temporarily break the membership query
2. Reload the app while logged in

**Expected:**
- [ ] App renders minimal "Safe Mode Shell" (if fully blocked)
- [ ] OR Navigation shows only core modules (if partial)
- [ ] "Sign Out" button works
- [ ] "Switch Company" button appears (if multi-company user)
- [ ] "Retry Loading" button attempts refresh

**Cleanup:**
- Unblock network requests

---

### 5. Safe Mode Test (Flags Failure)

**Steps:**
1. Navigate to `/app`
2. Simulate feature_flags table error:
   - Block `*feature_flags*` requests
   - OR temporarily break RLS policy
3. Refresh page

**Expected:**
- [ ] Navigation shows only core modules (tasks, projects, calendar, notes, docs, groups, locations, admin)
- [ ] Premium modules (CRM, LMS, Coaching, etc.) are hidden
- [ ] Health page shows "Module Flags: Warning - Running in safe mode"
- [ ] Core modules remain accessible

**Cleanup:**
- Restore normal network

---

### 6. Logging Redaction Test

**Steps:**
1. Open browser DevTools → Console
2. Navigate to Health page and trigger an error (or use the test from #3)
3. Check console output

**Expected:**
- [ ] Error log shows `🚨 Error [ID]` format
- [ ] No `access_token` or `refresh_token` values in logs
- [ ] No API keys in logs
- [ ] JWT tokens (if any) are replaced with `[REDACTED]`
- [ ] User IDs are truncated to first 8 chars + `...`
- [ ] Stack traces show only first 5 lines

---

### 7. Error ID Copy & Support

**Steps:**
1. Trigger any error (use test from #2 or #3)
2. Click the copy button next to Error Reference

**Expected:**
- [ ] Error ID copied to clipboard
- [ ] Check icon appears briefly (green checkmark)
- [ ] ID format: 8 uppercase alphanumeric characters (no ambiguous 0/O, 1/I)

---

### 8. Navigation After Error

**Steps:**
1. Navigate to a module that throws an error
2. Use sidebar to navigate to a different module

**Expected:**
- [ ] Different module loads successfully
- [ ] Error state is isolated to the original module
- [ ] No white screen or full app crash

---

## Automated Checks (Future)

For CI/CD integration, consider:
- [ ] Unit tests for `logError` redaction patterns
- [ ] Component tests for error boundary renders
- [ ] Integration test for health endpoint responses
- [ ] E2E test simulating network failures

---

## Files Reference

### Core Errors
```
src/core/errors/
├── index.ts              # Public exports
├── logging.ts            # Safe error logging
├── AppErrorBoundary.tsx  # Global error boundary
├── ModuleErrorBoundary.tsx # Per-module boundary
└── SafeModeShell.tsx     # Minimal fallback shell
```

### Health Page
```
src/pages/app/health/
└── HealthPage.tsx        # Diagnostics page
```

### Integration Points
- `src/App.tsx` - Global boundary wrapper
- `src/components/layout/AppLayout.tsx` - Module boundary wrapper around Outlet
- `src/core/modules/useCompanyModuleFlags.ts` - Safe mode flag

---

## Rollback

To disable error boundaries:
1. Remove `<AppErrorBoundary>` wrapper from `App.tsx`
2. Remove `<ModuleErrorBoundary>` wrapper from `AppLayout.tsx`
3. Health page can remain (no harm)

---

*Last verified: [Date TBD after manual testing]*
