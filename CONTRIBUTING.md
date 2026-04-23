# Contributing

## Workflow

1. Create a feature branch from `main`.
2. Review the canonical active masterplan before implementation:
   - `docs/cherrypick/CHERRYPICK_SINGLE_PLAYER_EXECUTION_MASTERPLAN.md`
3. `SmartIQ` source control stays on GitHub for this repository.
4. Do not add or use Gitea mirroring for `SmartIQ`.
5. Treat the current public product as single-player-first unless a task explicitly targets internal host/runtime systems.
6. Make focused changes and add tests when applicable.
7. Run relevant checks locally:
   - Backend: `cd backend && mvn -q test`
   - Frontend: `cd frontend && npm ci && npm run lint && npm run build`
8. Open a pull request using the repository template.

## Pull Request Expectations

- Explain the change and reason.
- Add a masterplan alignment note:
  - execution sprint
  - milestone / todo item(s)
  - deviation rationale (if applicable)
- Include screenshots for UI changes.
- Document migration steps when data/schema changes are included.
- Link related issues.
