# Content Truth Audit

## Metadata

- Generated: 2026-03-11T07:10:36.652Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: CONDITIONAL - editorial cleanup still required | score 0.981 | total issues 150
- ET: BLOCKED - ET is not launch-ready | score 0.974 | total issues 195

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.981
- Launch readiness: CONDITIONAL - editorial cleanup still required
- Total issue hits: 150
- Warning count: 150

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 60
- recycled option pool: 90
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN Culture/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN History/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- EN Sports/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- EN Geography/TRUE_FALSE: 0/30 cards flagged (0%) | n/a

### Categorized Findings Summary

#### templated/scaffold wording

- `culture-open-001` Culture/OPEN: Culture: Select statements that are true. Topic clue: Mona Lisa.
- `culture-open-002` Culture/OPEN: Culture: Which statements are correct? Topic clue: Starry Night.
- `culture-open-003` Culture/OPEN: Culture: Pick all true statements. Topic clue: Hamlet.
- `culture-open-004` Culture/OPEN: Culture: Identify factual statements. Topic clue: Macbeth.

#### recycled option pool

- `culture-open-001` Culture/OPEN: Culture: Select statements that are true. Topic clue: Mona Lisa.
- `culture-open-002` Culture/OPEN: Culture: Which statements are correct? Topic clue: Starry Night.
- `culture-open-003` Culture/OPEN: Culture: Pick all true statements. Topic clue: Hamlet.
- `culture-open-004` Culture/OPEN: Culture: Identify factual statements. Topic clue: Macbeth.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.974
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 195
- Warning count: 195

### Issue Counts

- language leakage: 0
- broken grammar: 75
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 30
- recycled option pool: 90
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- ET Culture/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar, template_scaffold
- ET Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar, template_scaffold
- ET Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar, template_scaffold
- ET History/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- ET Sports/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- ET Geography/TRUE_FALSE: 0/30 cards flagged (0%) | n/a

### Categorized Findings Summary

#### broken grammar

- `culture-open-001-et` Culture/OPEN: Kultuur: Vali tõesed vaited. Teemavihe: Mona Lisa.
- `culture-open-002-et` Culture/OPEN: Kultuur: Millised vaited on oiged? Teemavihe: Starry Night.
- `culture-open-003-et` Culture/OPEN: Kultuur: Vali koik tõesed vaited. Teemavihe: Hamlet.
- `culture-open-005-et` Culture/OPEN: Kultuur: Millised variandid on oiged? Teemavihe: The Odyssey.

#### templated/scaffold wording

- `culture-open-002-et` Culture/OPEN: Kultuur: Millised vaited on oiged? Teemavihe: Starry Night.
- `culture-open-005-et` Culture/OPEN: Kultuur: Millised variandid on oiged? Teemavihe: The Odyssey.
- `culture-open-008-et` Culture/OPEN: Kultuur: Millised vaited on oiged? Teemavihe: The Great Gatsby.
- `culture-open-011-et` Culture/OPEN: Kultuur: Millised variandid on oiged? Teemavihe: The Godfather.

#### recycled option pool

- `culture-open-001-et` Culture/OPEN: Kultuur: Vali tõesed vaited. Teemavihe: Mona Lisa.
- `culture-open-002-et` Culture/OPEN: Kultuur: Millised vaited on oiged? Teemavihe: Starry Night.
- `culture-open-003-et` Culture/OPEN: Kultuur: Vali koik tõesed vaited. Teemavihe: Hamlet.
- `culture-open-004-et` Culture/OPEN: Kultuur: Tuvasta faktivaided. Teemavihe: Macbeth.

