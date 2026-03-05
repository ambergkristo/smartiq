---
title: SmartIQ white-label M2 IP risk mitigation pack
type: milestone-pack
status: active
date: 2026-03-05
owner: Agent 0
milestone: M2
sprint: S2
---

# SmartIQ White-Label M2 IP Risk Mitigation Pack

## Purpose

This document is the canonical M2 artifact for IP risk mitigation:
1. gameplay and copy differentiation register
2. branding asset provenance register
3. legal/IP assessment memo

## Canonical Evidence Files

1. Copy-delta register:
   - `docs/plans/2026-03-05-m2-copy-delta-register.csv`
2. Branding asset provenance register:
   - `docs/plans/2026-03-05-m2-branding-asset-provenance.csv`
3. Legal assessment memo:
   - `docs/plans/2026-03-05-m2-legal-ip-assessment.md`

## Gate Command

```bash
node tools/validate_m2_ip_risk_gate.js
```

## Current Status

1. Sprint `S2/M2`: `IN_PROGRESS` (prep).
2. Evidence mode: `DEMO_PREP`.
3. Current gate checks:
   - copy rows pending/rejected: `3`
   - provenance rows pending/rejected: `3`
   - legal decision: `PENDING`
   - legal sign-off: `TBD`
4. Gate target state is not reached until:
   - legal memo decision is `GO`
   - legal owner sign-off is dated
   - no `pending` or `rejected` items remain in copy/provenance reviews.
