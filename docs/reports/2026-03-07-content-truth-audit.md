# Content Truth Audit

## Metadata

- Generated: 2026-03-10T16:30:58.282Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: CONDITIONAL - editorial cleanup still required | score 0.979 | total issues 150
- ET: BLOCKED - ET is not launch-ready | score 0.963 | total issues 275

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.979
- Launch readiness: CONDITIONAL - editorial cleanup still required
- Total issue hits: 150
- Warning count: 150

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 150
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN Sports/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Geography/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Culture/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN History/TRUE_FALSE: 0/30 cards flagged (0%) | n/a

### Categorized Findings Summary

#### recycled option pool

- `sports-open-001` Sports/OPEN: Sports: Select statements that are true. Topic clue: Football.
- `sports-open-002` Sports/OPEN: Sports: Which statements are correct? Topic clue: Basketball.
- `sports-open-003` Sports/OPEN: Sports: Pick all true statements. Topic clue: Tennis.
- `sports-open-004` Sports/OPEN: Sports: Identify factual statements. Topic clue: Cricket.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.963
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 275
- Warning count: 275

### Issue Counts

- language leakage: 0
- broken grammar: 125
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 150
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- ET Sports/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Geography/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Culture/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET History/TRUE_FALSE: 0/30 cards flagged (0%) | n/a

### Categorized Findings Summary

#### broken grammar

- `sports-open-001-et` Sports/OPEN: Sport: Vali tõesed vaited. Teemavihe: Football.
- `sports-open-002-et` Sports/OPEN: Sport: Millised vaited on oiged? Teemavihe: Basketball.
- `sports-open-003-et` Sports/OPEN: Sport: Vali koik tõesed vaited. Teemavihe: Tennis.
- `sports-open-005-et` Sports/OPEN: Sport: Millised variandid on oiged? Teemavihe: Rugby.

#### recycled option pool

- `sports-open-001-et` Sports/OPEN: Sport: Vali tõesed vaited. Teemavihe: Football.
- `sports-open-002-et` Sports/OPEN: Sport: Millised vaited on oiged? Teemavihe: Basketball.
- `sports-open-003-et` Sports/OPEN: Sport: Vali koik tõesed vaited. Teemavihe: Tennis.
- `sports-open-004-et` Sports/OPEN: Sport: Tuvasta faktivaided. Teemavihe: Cricket.

