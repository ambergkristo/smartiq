---
title: SmartIQ white-label M1 payment signal validation
type: milestone-pack
status: active
date: 2026-03-05
owner: Agent 0
milestone: M1
sprint: S1
ledger: docs/plans/2026-03-05-m1-payment-signal-ledger.json
---

# SmartIQ White-Label M1 Payment Signal Validation

## Purpose

This document defines the canonical S1/M1 execution artifact for business validation:
1. qualified outreach attempts
2. discovery calls
3. paid-pilot-ready intent signals

Canonical machine-readable evidence source:
1. `docs/plans/2026-03-05-m1-payment-signal-ledger.json`

## Entry Conditions (locked)

1. ICP is locked to corporate training teams in Estonia/Baltics.
2. Pricing baseline is locked to M5 GTM pack:
   - `docs/plans/2026-03-05-m5-gtm-pilot-readiness-pack.md`
3. S1/M1 is the only active milestone.

## Exit Criteria (M1 gate)

1. Outreach attempts logged: `>= 10`
2. Discovery calls logged: `>= 3`
3. Paid-pilot-ready signals logged: `>= 2`

Verification command:

```bash
node tools/validate_m1_payment_signal_gate.js docs/plans/2026-03-05-m1-payment-signal-ledger.json
```

CSV import command (merge by `id`):

```bash
node tools/import_m1_payment_signal_csv.js \
  --ledger docs/plans/2026-03-05-m1-payment-signal-ledger.json \
  --outreach docs/plans/2026-03-05-m1-outreach-template.csv \
  --discovery docs/plans/2026-03-05-m1-discovery-template.csv \
  --pilot docs/plans/2026-03-05-m1-pilot-intent-template.csv \
  --mode merge
```

Template files:
1. `docs/plans/2026-03-05-m1-outreach-template.csv`
2. `docs/plans/2026-03-05-m1-discovery-template.csv`
3. `docs/plans/2026-03-05-m1-pilot-intent-template.csv`

## Ledger Row Schema

### Outreach attempt row

1. `id`: unique ID (for example `oa-001`)
2. `date`: ISO date
3. `organization`: company/team name (or anonymized ID)
4. `channel`: `email|linkedin|phone|intro`
5. `status`: `sent|replied|meeting_booked|closed_lost|closed_won`
6. `qualified`: boolean (`true` required for M1 count)
7. `owner`: actor responsible for follow-up

### Discovery call row

1. `id`: unique ID (for example `dc-001`)
2. `date`: ISO date
3. `organization`: company/team name (or anonymized ID)
4. `qualified`: boolean
5. `outcome`: `next_step|hold|closed_lost`
6. `owner`: actor responsible for follow-up

### Pilot intent signal row

1. `id`: unique ID (for example `pi-001`)
2. `date`: ISO date
3. `organization`: company/team name (or anonymized ID)
4. `signalType`: `paid_pilot_ready`
5. `sourceCallId`: linked discovery call ID
6. `owner`: actor responsible for conversion

## Current Status

1. Sprint `S1/M1`: `IN_PROGRESS`
2. Ledger initialized.
3. Current gate counts:
   - qualified outreach attempts: `0 / 10`
   - qualified discovery calls: `0 / 3`
   - paid-pilot-ready signals: `0 / 2`
4. Gate not yet passable until threshold counts are reached.
