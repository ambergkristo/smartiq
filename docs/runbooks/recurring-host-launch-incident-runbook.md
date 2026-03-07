# Recurring Host Launch Incident Runbook

Use this runbook for the narrow recurring-host launch path. It is scoped to the incidents most likely to break first-time host trust:

1. auth or sign-in failures,
2. billing checkout or entitlement recovery failures,
3. live-session launch/resume/replay failures.

## First 5 minutes

1. Confirm backend identity:
   ```powershell
   curl -s https://<backend-domain>/version
   ```
2. Confirm liveness:
   ```powershell
   curl -i https://<backend-domain>/health
   ```
3. Confirm metrics export:
   ```powershell
   curl -i https://<backend-domain>/actuator/prometheus
   ```
4. Confirm the current recurring-host KPI snapshot exists:
   ```powershell
   node tools/generate_recurring_host_pilot_summary.js --backend-url=https://<backend-domain> --internal-api-key=<key> --json-output=$env:TEMP\smartiq-recurring-host-summary.json
   npm run report:recurring-host:launch-kpi -- --summary-json=$env:TEMP\smartiq-recurring-host-summary.json --output=$env:TEMP\smartiq-recurring-host-launch-kpi.md
   ```

## Auth incident

Symptoms:

1. host cannot complete sign-in,
2. `/api/me` fails after sign-in,
3. runtime session is unexpectedly cleared.

Checks:

1. verify recent auth traffic in tenant usage summary:
   - `host.workspace.bootstrapped`
   - `host.auth.completed`
2. confirm `GET /api/me/tenant-runtime` succeeds with a valid bearer token,
3. confirm `TenantAuthController` challenge/consume path is reachable in production config.

Immediate action:

1. capture the failing host email and tenant if known,
2. create or update a support case under category `onboarding`,
3. if auth failures are systemic, pause outreach and route hosts through manual founder-assisted sign-in until fixed.

## Billing incident

Symptoms:

1. checkout does not open,
2. billing return lands but entitlements do not refresh,
3. hosted launch is blocked even after payment recovery.

Checks:

1. confirm `billing.checkout.started` is emitted,
2. confirm billing webhook delivery and signature verification logs,
3. confirm the tenant subscription state in `/api/me/tenant-runtime`,
4. confirm the host sees a `Restore billing` path if subscription is blocked.

Immediate action:

1. create or update a support case under category `billing`,
2. if checkout is systemic, disable launch outreach and direct users to manual upgrade recovery,
3. if webhook ingestion is broken, prioritize backend repair before new launch traffic.

## Live-session incident

Symptoms:

1. host can authenticate but cannot create or resume a live session,
2. room join works but duplicate/replay or review fails,
3. player room entry is available but host control is not.

Checks:

1. inspect recent host audit events for:
   - `HOST_GAME_SESSION_CREATED`
   - `HOST_GAME_SESSION_COMPLETED`
2. inspect room/session metrics and application logs,
3. confirm tenant-scoped resume and duplicate flows are returning valid snapshots,
4. confirm the room join link still resolves through `#/join/<ROOMCODE>`.

Immediate action:

1. create or update a support case under category `live_run`,
2. if live control is degraded, advise hosts to avoid duplicate/replay until the path is restored,
3. if room create/join is broken broadly, move directly to rollback decision.

## Rollback trigger

Prepare rollback when one or more conditions persist beyond 10 minutes:

1. `/health` is degraded or flapping,
2. auth failures block first-session activation,
3. billing recovery fails for multiple hosts,
4. live-session failures block create, resume, or replay on the canonical host path.

Use the generic operational references for the actual rollback procedure:

1. `docs/plans/operational-runbook.md`
2. `docs/plans/deployment-checklist.md`
3. `docs/observability.md`
