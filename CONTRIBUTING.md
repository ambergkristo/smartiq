# Contributing

## Workflow

1. Create a feature branch from `main`.
2. Make focused changes and add tests when applicable.
3. Run relevant checks locally:
   - Backend: `cd backend && mvn -q test`
   - Frontend: `cd frontend && npm ci && npm run lint && npm run build`
4. Open a pull request using the repository template.

## Pull Request Expectations

- Explain the change and reason.
- Include screenshots for UI changes.
- Document migration steps when data/schema changes are included.
- Link related issues.
