# Contributing

## Workflow

1. Create a feature branch from `main`.
2. Review the canonical active masterplan before implementation:
   - `docs/plans/2026-03-06-recurring-host-saas-masterplan-v1.md`
3. `SmartIQ` source control stays on GitHub for this repository.
4. Do not add or use Gitea mirroring for `SmartIQ`.
5. No later than `M4` completion, update the active SmartIQ branch into `main`.
6. Make focused changes and add tests when applicable.
7. Run relevant checks locally:
   - Backend: `cd backend && mvn -q test`
   - Frontend: `cd frontend && npm ci && npm run lint && npm run build`
8. Open a pull request using the repository template.

## Pull Request Expectations

- Explain the change and reason.
- Add a masterplan alignment note:
  - phase
  - roadmap item(s)
  - deviation rationale (if applicable)
- If the change closes `M4`, the PR must update `main` for `SmartIQ`; do not leave `M4` completion only on a feature branch.
- Include screenshots for UI changes.
- Document migration steps when data/schema changes are included.
- Link related issues.
