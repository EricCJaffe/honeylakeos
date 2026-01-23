# Security Advisor Notes

> Last reviewed: 2026-01-23  
> Status: All actionable items resolved; 2 non-actionable warnings documented below.

---

## Current Security Advisor Findings

### 1. Extension in Public (WARN)

**Warning:** `pg_net` extension is installed in the `public` schema.

**Why it exists:** Supabase pre-installs `pg_net` for HTTP/webhook functionality. Moving extensions between schemas requires superuser privileges not available through migrations.

**Risk assessment:** LOW - The extension is read-only for application users; only database superusers can modify extension behavior.

**Resolution:** Non-actionable via migrations. This is a Supabase infrastructure concern.

---

### 2. Leaked Password Protection Disabled (WARN)

**Warning:** Leaked password protection is currently disabled.

**What it does:** When enabled, Supabase checks new passwords against known breach databases (HaveIBeenPwned) and rejects compromised passwords.

**Resolution:** Dashboard-only setting. An admin must enable manually:

```
Supabase Dashboard → Authentication → Providers → Email → Enable "Leaked password protection"
```

Or via Lovable Cloud:
```
Cloud View → Authentication → Email Provider Settings → Enable Leaked Password Protection
```

---

## Reviewed & Confirmed Secure

### SECURITY DEFINER Functions

All 50+ `SECURITY DEFINER` functions in the `public` schema have explicit `SET search_path TO 'public'` declarations. No action required.

Sample verification:
- `accept_employee_invite` ✓
- `accept_employee_invites_on_profile_upsert` ✓
- `accept_coaching_invitation` ✓
- `process_coaching_invitation_response` ✓
- `calculate_activation_score` ✓

### RLS Policies with `USING (true)`

Four SELECT policies use `USING (true)` - all are **intentionally public** for reference/catalog data:

| Table | Policy | Reason |
|-------|--------|--------|
| `plans` | Plans are viewable by authenticated users | Users must see available subscription plans |
| `plan_entitlements` | Anyone can read plan entitlements | Users need to check what features their plan includes |
| `coa_templates` | coa_templates_select | Chart of Accounts templates are shared catalogs |
| `framework_finance_playbook_items` | Playbook items viewable by authenticated users | Finance playbook is reference content |

**Security notes:**
- All four tables contain **non-sensitive reference data** (no user PII, no company secrets)
- Write operations (INSERT/UPDATE/DELETE) on all four tables are restricted to site admins
- These are catalog/lookup tables, not user data tables

---

## Summary

| Finding | Status | Action Required |
|---------|--------|-----------------|
| Extension in Public (pg_net) | Non-actionable | None (Supabase infrastructure) |
| Leaked Password Protection | Dashboard-only | Admin should enable in Auth settings |
| SECURITY DEFINER search_path | ✅ Verified | None - all functions compliant |
| Permissive SELECT policies | ✅ Reviewed | None - intentional for catalog data |

---

## Recommended Follow-up Actions

1. **Enable Leaked Password Protection** (Priority: Medium)
   - Navigate to Authentication → Email Provider in Supabase/Cloud dashboard
   - Toggle on "Leaked password protection"
   - This adds breach-check validation at signup/password-change time

2. **Periodic Review** (Quarterly)
   - Re-run Security Advisor to catch new findings
   - Review any new `SECURITY DEFINER` functions for search_path
   - Audit any new RLS policies for overly permissive access

---

## Verification Commands

```sql
-- Check for SECURITY DEFINER functions missing search_path
SELECT proname, prosecdef, proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true AND n.nspname = 'public'
  AND (proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%'
  ));

-- Find overly permissive policies (review each for intent)
SELECT tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true');
```
