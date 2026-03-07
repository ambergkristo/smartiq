# Seed Recurring-Host Pilot Data

Use this runbook to create a minimal real pilot dataset for M6 recurring-host live capture without bypassing internal API security.

This runbook is for bootstrap validation only. It proves that telemetry, support-case logging, paid-conversion rails, and live capture tooling work end-to-end, but it does not satisfy the `M6` definition of done on its own because seeded tenants are not counted as `real pilot hosts`.

## What this seeds

- 10 active tenants
- 1 active owner membership per tenant
- real usage events through existing internal white-label admin endpoints
- founder-owned support-case evidence with both open and resolved examples
- enough telemetry for:
  - `activatedHosts >= 10`
  - `repeatHosts >= 5`
  - `paidConversions >= 1`

This bootstrap also creates lightweight support-case evidence and one paid-conversion path so the live artifact is not empty on blocker ownership. The resulting cohort is intentionally treated as `bootstrap-seeded`, not as real pilot proof.

## Required environment

```powershell
$env:BACKEND_URL="https://<your-render-backend>"
$env:SMARTIQ_INTERNAL_API_KEY="<internal-api-key>"
```

## Dry run first

```powershell
node tools/seed_recurring_host_pilot.js
```

The script defaults to dry-run and prints the actions it would take.

## Apply against live backend

```powershell
node tools/seed_recurring_host_pilot.js --apply
```

Equivalent npm command:

```powershell
npm run seed:recurring-host:pilot -- --apply
```

GitHub Actions option:

```powershell
gh workflow run recurring-host-pilot-seed.yml --repo ambergkristo/smartiq -f backend_url=https://<your-render-backend>
```

## Contracts used

- `POST /internal/wl/tenants`
  - request: `slug`, `name`, optional `billingEmail`
- `POST /internal/wl/tenants/{tenantId}/members`
  - request: `email`, optional `displayName`, `role`
- `POST /internal/wl/tenants/{tenantId}/usage-events`
  - request: `eventType`, `eventValue`, optional `eventTime`, optional object `metadata`
- `GET /internal/wl/tenants`
- `GET /internal/wl/tenants/{tenantId}/members`
- `GET /internal/wl/tenants/{tenantId}/usage-summary`
- `GET /internal/wl/tenants/{tenantId}/pilot-summary`

## Expected result in next recurring-host pilot capture

If the environment was previously empty, the next live capture should report:

- `totalTenants = 10`
- `activeTenants = 10`
- `bootstrapSeededTenants = 10`
- `realPilotTenants = 0`
- `activatedHosts = 10` total
- `repeatHosts = 5` total
- `paidConversions >= 1` total
- `thresholdStatus = NOT_YET` until real pilot hosts exist

If the environment already contains tenants, the capture should move to at least:

- `totalTenants >= current + 10` if none of the seeded slugs exist yet
- `activatedHosts >= previous total`
- `repeatHosts >= previous total`
- `thresholdStatus` remains driven by the real, non-seeded cohort only

## Verification

After apply, confirm the seeded tenants exist:

```powershell
curl -s -H "X-Internal-Api-Key: $env:SMARTIQ_INTERNAL_API_KEY" "$env:BACKEND_URL/internal/wl/tenants?q=pilot-recurring-host"
```

Then run the capture again:

```powershell
$env:BACKEND_URL="https://<your-render-backend>"
$env:SMARTIQ_INTERNAL_API_KEY="<internal-api-key>"
npm run report:recurring-host:pilot-capture
```

The script itself also prints per-tenant pilot summary flags after a successful `--apply`.
