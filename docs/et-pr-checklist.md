# ET PR Checklist Snippet

Copy this block into ET-related PR descriptions.

## ET Readiness (Paste into PR)

```markdown
### ET Readiness

- [ ] `node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0`
- [ ] `node tools/validate_locale_packs.js data/smart10`
- [ ] `node tools/audit_locale_coverage.js data/smart10 --required=en,et --min-per-combo=30`
- [ ] `node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80`

### ET Runtime Smoke

- [ ] `BACKEND_URL=http://localhost:8081 npm run report:et:runtime`
- [ ] Attach generated `docs/reports/et-runtime-smoke-*.md` summary to PR notes

### ET Status

| Check | Status |
| --- | --- |
| ET schema/contract validation | PASS / FAIL |
| Locale pack validation | PASS / FAIL |
| Locale coverage audit | PASS / FAIL |
| ET quality score gate (>=0.80) | PASS / FAIL |
| ET runtime smoke report | PASS / FAIL |
```
