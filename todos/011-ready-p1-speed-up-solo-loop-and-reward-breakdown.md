# Sprint B: Speed Up Solo Loop And Reward Breakdown

## Goal

Make solo play feel closer to CherryPick's intended risk rhythm and make the current XP contract explicit in the UI.

## Scope

- [x] Remove the extra solo-only `SUBMIT PICK -> LOCK IN` step and let solo rounds lock directly from question state.
- [x] Add an explicit solo XP breakdown helper so current reward mechanics live in one contract.
- [x] Update result UI to show `Base XP`, `Speed bonus`, `Cherry boost`, and total round/session XP.
- [x] Remove stale stored solo `difficulty` config from the active app shell path.
- [x] Update focused tests for solo gameplay pacing and XP presentation.

## Verification

- [x] `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.server-mode.test.jsx src/state/cherryRounds.test.js src/components/GameBoard.test.jsx src/components/RoundSummary.test.jsx`
- [x] `npm --prefix frontend run lint`
- [x] `npm --prefix frontend run build`

## Notes

- The current solo reward contract is now explicit: `Cherry` (`x2`) and `Double Cherry` (`x3`) are live, `Speed bonus` is intentionally `0`, and `Golden Cherry` remains future scope rather than implied runtime behavior.
- Browser smoke for the faster solo loop is still pending before Sprint B can be closed end-to-end.
