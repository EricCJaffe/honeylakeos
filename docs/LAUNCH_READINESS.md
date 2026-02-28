# Launch Readiness Checklist

**Document Status**: Internal Use Only  
**Last Updated**: 2026-01-17  
**Prepared For**: Platform Launch to Coaches and Client Companies

> Note (2026-02-27): This document contains legacy coaching-era content and is retained for historical reference only. Current Honey Lake implementation does not use the coaching module; rely on `docs/TASKS.md`, `docs/RUNBOOK.md`, and `docs/HIPAA_COMPLIANCE_BASELINE.md` for active launch scope.

---

## Executive Summary

This platform is a **coach-led operating system** designed for:
1. **Coaching Organizations** managing client relationships and frameworks
2. **Client Companies** running their business with framework-guided workflows
3. **Solo Coaches** working independently with clients

The system is **production-ready** with intentional limitations documented below.

---

## 1. Supported Use Cases ✅

### A) Solo Coach Journey
| Step | Status | Notes |
|------|--------|-------|
| Create coaching org company | ✅ | Onboarding flow handles site anchoring |
| Enable Coaching + Framework modules | ✅ | Module toggle in Company Console |
| Adopt EOS framework for own company | ✅ | Marketplace browser available |
| Publish framework to marketplace | ✅ | Coach-org visibility controls |
| Add first client company | ✅ | Engagement creation flow |
| Assign self as coach | ✅ | Coach assignment mutations |
| Recommend actions to client | ✅ | Recommendation composer |
| Review client health | ✅ | Health scoring v2 implemented |

### B) Client Company (Self-Serve)
| Step | Status | Notes |
|------|--------|-------|
| Create company | ✅ | Onboarding page |
| Select framework | ✅ | System templates + coach recommendations |
| Skip onboarding steps | ✅ | No forced steps, app usable without framework |
| Use Tasks/Projects/Calendar | ✅ | Core modules always enabled |
| View framework dashboard | ✅ | Current Framework tab |

### C) Client Company (Coach-Assisted)
| Step | Status | Notes |
|------|--------|-------|
| Coach creates engagement | ✅ | CoachingPage > All Clients |
| Client sees recommendations | ✅ | Pending recommendations panel |
| Client accepts/rejects | ✅ | Acceptance flow implemented |
| Health metrics reflect progress | ✅ | Weighted health scoring |

### D) Coaching Firm (Multi-Coach)
| Step | Status | Notes |
|------|--------|-------|
| Create coaching org | ✅ | Company creation |
| Add multiple coaches | ✅ | Coaching coach profiles |
| Assign clients to coaches | ✅ | Coach assignments |
| Manager reviews dashboards | ✅ | Coach manager views (entitlement-gated) |
| Compare health across coaches | ✅ | CoachingOrgHealthRollup component |

---

## 2. Security & Permission Boundaries ✅

### Verified Controls
- [x] **Coach cannot mutate client data** without explicit engagement
- [x] **Module disable** blocks all CRUD operations at RLS level
- [x] **Company isolation** via RLS on all tables
- [x] **Admin override** in entitlement system respects company_admin/site_admin
- [x] **Grace period** allows access with warnings, never breaks reads
- [x] **Expired plans** are read-only, never delete data

### Security Fixes Applied (This Pass)
- [x] Added DELETE policies for: groups, tasks, events, group_members, task_assignees, event_attendees

### Known Security Warnings
| Issue | Severity | Status |
|-------|----------|--------|
| Leaked Password Protection | WARN | Requires Supabase Auth config change |
| Dev RPC (get_table_columns) | WARN | Only accessible in DEV mode, add super_admin check later |

---

## 3. UX Clarity Audit ✅

### Terminology Consistency
- **Framework** = Operating methodology (EOS, Scaling Up, etc.)
- **Module** = Feature area (Tasks, Projects, LMS, CRM, etc.)
- **Template** = Reusable entity definition (task template, project template)
- **Engagement** = Coach-client relationship record

### Error Message Standards
- Generic fallback: "Something went wrong" (only when no specific message)
- Permission denial: "Contact your administrator"
- Module disabled: "The {Module} module is not enabled for your company"
- Plan limits: "You've reached your limit of {N}. Upgrade your plan to add more."

### Empty State Guidance
- All list views have helpful empty states
- Onboarding is "guided, not required"
- Framework adoption is optional for app functionality

---

## 4. Performance Considerations

### Implemented Safeguards
- LIST_LIMITS (25-50 items) for CRM, Contacts, LMS
- Company-scoped queries with proper indexes
- React Query caching for repeated reads
- Graceful degradation when partial data available

### Monitored Areas
- Coach dashboards with many clients (paginated)
- Health scoring across multiple frameworks (computed on read)
- Marketplace browsing (filtered server-side)

---

## 5. Kill-Switch Readiness ✅

### Modules That Can Be Disabled Safely
| Module | Disable Impact | User Message |
|--------|----------------|--------------|
| Coaching | Hides coaching nav, blocks coach operations | "Module Disabled" page |
| Frameworks | Hides framework nav, blocks adoption | "Module Disabled" page |
| LMS | Hides LMS nav, blocks content access | "Module Disabled" page |
| CRM | Hides CRM nav, blocks client management | "Module Disabled" page |
| Forms | Hides forms nav, blocks submissions | "Module Disabled" page |

**Verified Behavior**:
- Core modules (projects, tasks, calendar, notes, documents) always available
- Disabling module hides nav items, LinkPicker options, project tabs
- Data preserved during disable, restored on re-enable
- RLS blocks operations at database level

---

## 6. Known Limitations (Intentional)

### Not Implemented Yet
- [ ] Stripe payment integration (stubbed only)
- [ ] Recommendation history view
- [ ] Framework diff viewer for version comparison
- [ ] Advanced reporting dashboard
- [ ] Email notifications for recommendations
- [ ] Coaching team management page
- [ ] Framework concept/cadence counts on dashboard

### Deferred to vNext
- Automated health score snapshots (historical trends)
- Public framework marketplace
- Usage-based billing
- Multi-framework support per company
- External calendar sync (Google, Outlook)

---

## 7. "Explain to a Coach in 5 Minutes"

> "This platform helps you run your coaching business. You sign up, create your coaching org, and immediately get access to project management, tasks, calendar, notes, and documents.
> 
> When you're ready, you can adopt a framework like EOS to guide your operating rhythm. If you want to work with clients, enable the Coaching module and add them as engagements. You can recommend tasks, projects, and frameworks to clients—they decide whether to accept.
> 
> Everything is tracked with health scores so you can see at a glance how each client is doing. Your clients have their own workspace with full control—you're there to guide, not control."

---

## 8. Pre-Launch Checklist

### Before Going Live
- [x] All E2E user journeys validated
- [x] Missing DELETE policies added
- [x] Module disable tested
- [x] Error messages reviewed
- [x] Empty states have guidance
- [x] Entitlement system respects admin override
- [x] Grace period behavior documented
- [ ] Enable leaked password protection in Supabase Auth (recommended)
- [ ] Final smoke test with real coach account

### Monitoring After Launch
- Watch for RLS errors in logs
- Monitor health scoring performance
- Track engagement creation flow completion
- Review audit logs for unexpected patterns

---

## 9. Support Escalation Paths

| Issue Type | First Response |
|------------|----------------|
| Cannot create company | Check site bootstrapping, profiles table |
| Module appears locked | Verify company_modules settings |
| Coach cannot see client | Check engagement + membership status |
| Health scores incorrect | Review framework metric configuration |
| Plan limits confusion | Direct to Plans & Usage page |

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-17 | AI | Initial launch readiness document |
