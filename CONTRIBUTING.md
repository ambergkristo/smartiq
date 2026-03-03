# Contributing

## Workflow

1. Create a feature branch from `main`.
2. Review the canonical active masterplan before implementation:
   - `docs/plans/2026-03-03-masterplan-roadmap-to-beta.md`
3. Make focused changes and add tests when applicable.
4. Run relevant checks locally:
   - Backend: `cd backend && mvn -q test`
   - Frontend: `cd frontend && npm ci && npm run lint && npm run build`
5. Open a pull request using the repository template.

## Pull Request Expectations

- Explain the change and reason.
- Add a masterplan alignment note:
  - phase
  - roadmap item(s)
  - deviation rationale (if applicable)
- Include screenshots for UI changes.
- Document migration steps when data/schema changes are included.
- Link related issues.
