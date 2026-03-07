# Seed Recurring-Host Pilot Data

Use this runbook to create a minimal real pilot dataset for M6 recurring-host live capture without bypassing internal API security.

## What this seeds

- 3 active tenants
- 1 active owner membership per tenant
- real usage events through existing internal white-label admin endpoints
- enough telemetry for:
  - `activatedHosts >= 3`
  - `repeatHosts >= 2`

No support cases or billing conversions are created by this bootstrap.

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

- `totalTenants = 3`
- `activeTenants = 3`
- `activatedHosts = 3`
- `repeatHosts = 2`
- `paidConversions = 0`

If the environment already contains tenants, the capture should move to at least:

- `totalTenants >= current + 3` if none of the seeded slugs exist yet
- `activatedHosts >= 3`
- `repeatHosts >= 2`

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
