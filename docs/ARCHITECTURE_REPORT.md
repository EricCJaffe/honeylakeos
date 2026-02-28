# BusinessOS Architecture Report: Blast Radius & Runtime Inventory

**Generated:** 2026-01-23  
**Version:** 0.9.x-beta  
**Purpose:** Document runtime assumptions, failure points, external dependencies, and propose blast-radius reduction strategies.

---

## 1. Runtime / Deployment Assumptions

### Platform Architecture

| Aspect | Current State | File/Evidence |
|--------|--------------|---------------|
| **Build System** | Vite + React SPA | `vite.config.ts` |
| **Runtime** | Client-side SPA (no SSR) | `index.html` → `src/main.tsx` |
| **Backend** | Lovable Cloud (Supabase) | `src/integrations/supabase/client.ts` |
| **Edge Functions** | Deno-based, auto-deployed | `supabase/functions/` |
| **Long-running Server** | None - fully serverless | N/A |

### Key Implications

- **No middleware layer**: All route protection is client-side via `ProtectedRoute.tsx`
- **No server-side rendering**: Initial load requires full JS bundle
- **Stateless functions**: Edge functions are request-scoped, no persistent connections
- **Session management**: Handled entirely by Supabase Auth SDK in browser

---

## 2. App Entrypoints & Failure Impact

### Critical Entrypoints

| Entrypoint | File Path | Failure Impact |
|------------|-----------|----------------|
| **App Bootstrap** | `src/main.tsx` | ⛔ Total app crash |
| **Root Component** | `src/App.tsx` | ⛔ Total app crash |
| **Auth Provider** | `src/lib/auth.tsx` | ⛔ No login, blank screen |
| **Membership Provider** | `src/lib/membership.tsx` | ⛔ No company context, routing fails |
| **Protected Route** | `src/components/ProtectedRoute.tsx` | ⛔ Auth redirect loop |
| **App Layout** | `src/components/layout/AppLayout.tsx` | ⛔ All /app/* routes unusable |
| **Sidebar Navigation** | `src/components/layout/AppSidebar.tsx` | 🟡 Navigation broken, pages accessible via URL |
| **Module Guard** | `src/components/ModuleGuard.tsx` | 🟡 Module access fails gracefully |

### Route Handler Structure

```
src/App.tsx
├── Public Routes (/, /features, /pricing, /about, /contact)
│   └── No auth required - failures isolated
├── Auth Routes (/login, /signup, /invite)
│   └── Depends on: auth.tsx
└── Protected Routes (/app/*)
    └── Depends on: ProtectedRoute → AppLayout
        ├── membership.tsx (company context)
        ├── AppSidebar (navigation)
        └── Outlet (module pages)
```

### Edge Functions (Backend)

| Function | Path | Failure Impact |
|----------|------|----------------|
| `create-backup` | `supabase/functions/create-backup/` | 🟡 Backup feature unavailable |
| `restore-backup` | `supabase/functions/restore-backup/` | 🟡 Restore feature unavailable |
| `get-finance-metrics` | `supabase/functions/get-finance-metrics/` | 🟡 Finance dashboard degraded |
| `send-employee-invite-email` | `supabase/functions/send-employee-invite-email/` | 🟡 Invites fail silently |
| `manage-integration-secret` | `supabase/functions/manage-integration-secret/` | 🟡 Integration setup fails |
| `sop-review-reminders` | `supabase/functions/sop-review-reminders/` | 🟡 No reminders sent |

---

## 3. External Dependencies

### Primary (Supabase/Lovable Cloud)

| Service | Usage Location | Criticality |
|---------|----------------|-------------|
| **Supabase Auth** | `src/lib/auth.tsx` | ⛔ Critical - no fallback |
| **Supabase Database** | All hooks in `src/hooks/` | ⛔ Critical - no fallback |
| **Supabase Storage** | Attachments, documents | 🟡 Feature-specific |
| **Supabase Realtime** | Notifications (planned) | 🟡 Enhancement only |
| **Edge Functions Runtime** | `supabase/functions/` | 🟡 Async operations |

### Third-Party APIs (via Edge Functions)

| API | Edge Function | Purpose |
|-----|---------------|---------|
| **Resend** | `send-employee-invite-email` | Email delivery |
| **Plaid** (planned) | Banking integration | Bank sync |

### Client-Side Only

| Library | Purpose | Failure Impact |
|---------|---------|----------------|
| TanStack Query | Data fetching/caching | ⛔ All data fails |
| React Router | Navigation | ⛔ Routing broken |
| Framer Motion | Animations | 🟢 Graceful degradation |
| date-fns | Date formatting | 🟡 Display issues only |

---

## 4. Top 10 Highest-Risk Shared Components

### Tier 1: Catastrophic (App Unusable)

| # | Component | File Path | Blast Radius |
|---|-----------|-----------|--------------|
| 1 | **Supabase Client** | `src/integrations/supabase/client.ts` | All data operations fail |
| 2 | **Auth Provider** | `src/lib/auth.tsx` | No authentication, blank app |
| 3 | **Membership Provider** | `src/lib/membership.tsx` | No company context, routing fails |
| 4 | **Query Client** | `src/App.tsx` (inline) | All React Query operations fail |

### Tier 2: Severe (Major Features Broken)

| # | Component | File Path | Blast Radius |
|---|-----------|-----------|--------------|
| 5 | **AppLayout** | `src/components/layout/AppLayout.tsx` | All /app/* pages broken |
| 6 | **Module Access** | `src/hooks/useModuleAccess.ts` | Module gating fails |
| 7 | **Company Modules** | `src/hooks/useCompanyModules.ts` | Feature flags broken |
| 8 | **Navigation Config** | `src/lib/navigationConfig.ts` | Sidebar/routing breaks |

### Tier 3: Significant (Module-Level Impact)

| # | Component | File Path | Blast Radius |
|---|-----------|-----------|--------------|
| 9 | **Theme Provider** | `src/lib/theme.tsx` | Styling issues, usable |
| 10 | **Query Config** | `src/lib/queryConfig.ts` | Pagination/caching issues |

---

## 5. Proposed Module Boundary Map

### Current State (Flat Structure)

```
src/
├── components/     # 400+ files, mixed concerns
├── hooks/          # 100+ hooks, tightly coupled
├── pages/app/      # 30+ module folders
└── lib/            # Shared utilities
```

### Proposed Modular Monolith Structure

```
src/
├── core/                       # Core Platform (always loaded)
│   ├── auth/                   # Authentication
│   ├── membership/             # Company/tenant context
│   ├── navigation/             # Routing, sidebar
│   ├── layout/                 # AppLayout, AppTopbar
│   ├── errors/                 # Error boundaries, handlers
│   ├── data/                   # Supabase client factories
│   └── module-registry/        # Feature flags, module config
│
├── modules/                    # Feature Modules (lazy-loadable)
│   ├── tasks/                  # Tasks module
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── index.ts            # Module definition
│   ├── projects/
│   ├── calendar/
│   ├── notes/
│   ├── documents/
│   ├── groups/
│   ├── locations/
│   ├── crm/
│   ├── lms/
│   ├── forms/
│   ├── workflows/
│   ├── finance/
│   ├── legacy/
│   ├── reports/
│   └── announcements/
│
├── shared/                     # Shared UI components
│   ├── ui/                     # shadcn components
│   ├── entity-links/           # Cross-module linking
│   └── attachments/            # File handling
│
└── integrations/               # External service adapters
    └── supabase/
```

### Dependency Graph

```
                    ┌─────────────┐
                    │   App.tsx   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │   Core   │     │  Shared  │     │  Modules │
   └────┬─────┘     └────┬─────┘     └────┬─────┘
        │                │                │
        ▼                ▼                │
   ┌──────────────────────────┐          │
   │    Supabase/Lovable      │◄─────────┘
   │      Cloud Client        │
   └──────────────────────────┘
```

**Dependency Rules:**
- `Modules` → depend on `Core` and `Shared` only
- `Modules` → NEVER depend on other `Modules` directly
- `Shared` → depend on `Core` only
- `Core` → no internal dependencies except `integrations/`

---

## 6. Blast Radius Reduction Plan (Prioritized)

### Phase 1: Immediate Wins (1-2 days each)

| # | Change | Effort | Impact | Files Affected |
|---|--------|--------|--------|----------------|
| **1** | Add global React Error Boundary | Low | High | `App.tsx`, new `ErrorBoundary.tsx` |
| **2** | Add per-module error boundaries | Low | High | `ModuleGuard.tsx` |
| **3** | Create `feature_flags` table with caching | Medium | High | Migration, new hook |
| **4** | Add graceful fallback when flags fail | Low | Medium | `useCompanyModules.ts` |
| **5** | Add health check endpoint/page | Low | Medium | New edge function + page |

### Phase 2: Structural Improvements (3-5 days each)

| # | Change | Effort | Impact | Files Affected |
|---|--------|--------|--------|----------------|
| **6** | Create Module Registry singleton | Medium | High | New `src/core/module-registry/` |
| **7** | Wrap Supabase with safe client factories | Medium | Medium | New `src/core/data/` |
| **8** | Add request-scoped logging (request ID) | Medium | Medium | All hooks, edge functions |
| **9** | Move heavy workflows to jobs table | High | High | Migration, edge functions |
| **10** | Lazy-load non-core modules | High | Medium | `App.tsx`, all module pages |

### Priority Matrix

```
           HIGH IMPACT
                │
     ┌──────────┼──────────┐
     │   1, 2   │   6, 9   │
     │  (Do     │  (Plan   │
     │  First)  │  Next)   │
LOW ─┼──────────┼──────────┼─ HIGH EFFORT
     │   4, 5   │   10     │
     │  (Quick  │  (When   │
     │  Wins)   │  Stable) │
     └──────────┼──────────┘
                │
           LOW IMPACT
```

---

## 7. Current Gaps Summary

| Gap | Risk | Remediation |
|-----|------|-------------|
| No error boundaries | Single error → white screen | Add ErrorBoundary components |
| No module isolation | Module crash → app crash | Per-module boundaries + lazy loading |
| No feature flag cache | Supabase down → flags fail | Add local cache + fallback |
| No health checks | Silent failures | Add /health endpoint |
| Heavy ops in UI thread | Slow UI, timeouts | Move to Edge Functions + jobs |
| No request tracing | Hard to debug | Add request IDs to logs |
| Flat file structure | High coupling risk | Migrate to modular layout |

---

## 8. Recommended Implementation Order

1. **Error Boundaries** (Prompt 3) - Immediate blast radius containment
2. **Feature Flags + Kill Switches** (Prompt 2) - Disable broken modules
3. **Health Checks** (Prompt 3) - Visibility into system state
4. **Module Registry** (Prompt 2) - Structural foundation
5. **Workflow Isolation** (Prompt 4) - Long-term stability

---

## 9. Files to Read Before Implementing

### Core Understanding
- `src/App.tsx` - Route structure, providers
- `src/lib/auth.tsx` - Auth flow
- `src/lib/membership.tsx` - Tenant context
- `src/components/ModuleGuard.tsx` - Current gating

### Module System
- `src/hooks/useModuleAccess.ts` - Module check logic
- `src/hooks/useCompanyModules.ts` - Company module state
- `src/lib/navigationConfig.ts` - Route/nav structure

### Data Layer
- `src/integrations/supabase/client.ts` - DB client
- `src/lib/queryConfig.ts` - Caching strategy

---

## 10. Success Metrics

After implementing Prompts 2-4, verify:

- [ ] Module error doesn't crash entire app (error boundary catches)
- [ ] Disabling module via flag immediately hides from nav + blocks route
- [ ] Health check endpoint returns 200 when system healthy
- [ ] Feature flags load from cache if DB is slow
- [ ] Heavy workflow runs in background job, UI stays responsive
- [ ] Request ID appears in logs for traceable debugging

---

*This report is a point-in-time analysis. Re-run after major architectural changes.*
