# 0002 Module Gating via Feature Flags

## Date
2026-02-18

## Status
Accepted

## Context
The product contains a large set of optional modules. We need a reliable way to enable or disable modules per company while preserving data and preventing unauthorized access.

## Decision
Use module feature flags at the company level to gate navigation and access in the UI, and enforce operations at the database layer with RLS. Core modules remain always enabled.

## Consequences
- A disabled module must present a clear "Module Disabled" experience in the UI.
- Data is preserved during disable and restored on re-enable.
- RLS remains the source of truth for enforcement.

## Links
- `docs/LAUNCH_READINESS.md`
- `src/core/modules/`
