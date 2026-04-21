# CherryPick Pilot Runbook (v1)

Use this runbook for the first narrow production pilot after deploy.

## Goal

- prove the public CherryPick `PLAY`, `JOIN`, and `HOST` flows in a real environment
- confirm host-led live rooms are stable for real sessions
- collect only fix-oriented feedback

## Entry criteria

1. `main` is green on required CI checks.
2. `npm run release:check` passed on the release candidate commit.
3. public post-deploy verification passed:
   - `npm run smoke:postdeploy`
   - `npm run smoke:ops`
4. rollout owner, rollback owner, and support owner are assigned.

## Pilot size

- `3-5` real hosts
- prefer mixed desktop/mobile coverage
- keep support owner reachable during the pilot window

## Pilot script

1. Host opens `/`.
2. Host chooses `HOST`, creates a room, and shares the code.
3. Players use `JOIN` or `#/join/<ROOMCODE>`.
4. Host starts the live board.
5. One client refreshes during the waiting-room phase and confirms lobby resume.
6. New joins after launch must stay blocked.

## What to record

- room code
- host browser/device
- roster size at launch
- whether launch succeeded on first attempt
- whether refresh/resume worked
- whether a late join was correctly blocked
- biggest confusion point, if any

## Exit criteria

- no unresolved `P0`
- pilot hosts can create, launch, and finish sessions without operator rescue
- the top usability issues are concrete and fixable, not architectural blockers

## Canonical ops reference

- `docs/runbooks/cherrypick-launch-runbook.md`
