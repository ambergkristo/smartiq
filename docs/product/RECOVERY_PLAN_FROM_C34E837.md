# Recovery Plan From C34E837

## Baseline Commit

- Commit: `c34e837`
- Message: `feat(ui): redesign host gameplay console`
- Role of baseline: last defensible pre-regression point before the later ET runtime import expansion, answer-resolution summary rewrite, question-board spacing changes, and room/session recovery patch chain.

## Why Current HEAD Is Not The Recovery Base

Current `main` is not a safe stabilization base because it combines multiple overlapping change streams:

- ET enablement and ET runtime import changes
- UTF-8/encoding patches
- dataset truth and duplicate-ID patches
- realtime/session restore changes
- unrequested lobby/game-layout drift

Those streams were patched on top of each other instead of being reintroduced from a clean branch line. That makes current behavior contradictory to patch summaries and makes root-cause isolation unreliable.

## What Is Broken On Current HEAD

- ET runtime behavior is not trustworthy end to end.
- Dataset import currently mixes more than one ET source path.
- Cross-source ET duplicate IDs were introduced into runtime import flow.
- Selected answer vs submitted answer can diverge in the resolution UI path.
- Lobby topic selection UI drifted into a horizontal chip/slider pattern that was not part of the requested recovery scope.
- Game view spacing/layout changed as part of broader question-board redesign commits instead of isolated bugfix work.

## Recovery Principles

- Recover from one known baseline, not from the latest patched state.
- Reintroduce only one risk area at a time.
- Keep one canonical dataset source.
- Do not mix UI redesign work with stability work.
- Do not accept a patch summary as proof; verify runtime behavior directly.
- No feature work until the recovery checklist is green.

## Reintroduction Order

1. Baseline validation on `c34e837`
2. Canonical dataset source lock
3. ET UTF-8 verification
4. ET truth integrity verification
5. Answer selection/submission mapping verification
6. Session restore/rejoin work
7. Only after all of the above: feature resumption

## Verification Checklist

- Backend package succeeds on the recovery branch.
- Frontend production build succeeds on the recovery branch.
- Dataset import uses one canonical source path only.
- ET cards render diacritics correctly.
- ET card truth is validated against canonical source data.
- Selected answer matches submitted answer in runtime resolution.
- No unwanted topic slider appears in lobby.
- Approved gameplay spacing/layout remains intact.
- Host room restore is verified before any further session changes.
- Player room restore is verified before any further session changes.

## Current Baseline Validation Notes

- Backend package passed during branch setup.
- Frontend production build passed after installing worktree-local frontend dependencies.
- Minimal backend sanity test passed.
- Existing frontend sanity test file `src/App.server-mode.test.jsx` is not fully green on this baseline: two tests timed out during branch setup validation.

That means this branch is the cleanest recovery base found so far, but it is not being marked as fully validated yet.
