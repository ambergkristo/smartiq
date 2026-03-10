# Content Truth Audit

## Metadata

- Generated: 2026-03-10T15:37:04.562Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: CONDITIONAL - editorial cleanup still required | score 0.975 | total issues 180
- ET: BLOCKED - ET is not launch-ready | score 0.951 | total issues 360

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.975
- Launch readiness: CONDITIONAL - editorial cleanup still required
- Total issue hits: 180
- Warning count: 180

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 180
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN History/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Sports/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Geography/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Culture/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool
- EN Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool

### Categorized Findings Summary

#### recycled option pool

- `history-open-001` History/OPEN: History: Select statements that are true. Topic clue: Ancient Rome.
- `history-open-002` History/OPEN: History: Which statements are correct? Topic clue: Viking Age.
- `history-open-003` History/OPEN: History: Pick all true statements. Topic clue: Renaissance.
- `history-open-004` History/OPEN: History: Identify factual statements. Topic clue: Industrial Revolution.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.951
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 360
- Warning count: 360

### Issue Counts

- language leakage: 30
- broken grammar: 150
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 180
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- ET History/OPEN: 30/30 cards flagged (100%) | language_leakage, recycled_option_pool, broken_grammar
- ET Sports/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Geography/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Culture/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar
- ET Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar

### Categorized Findings Summary

#### language leakage

- `history-open-001-et` History/OPEN: Ajalugu: Vali tõesed vaited. Teemavihe: Ancient Rome.
- `history-open-002-et` History/OPEN: Ajalugu: Millised vaited on oiged? Teemavihe: Viking Age.
- `history-open-003-et` History/OPEN: Ajalugu: Vali koik tõesed vaited. Teemavihe: Renaissance.
- `history-open-004-et` History/OPEN: Ajalugu: Tuvasta faktivaided. Teemavihe: Industrial Revolution.

#### broken grammar

- `history-open-001-et` History/OPEN: Ajalugu: Vali tõesed vaited. Teemavihe: Ancient Rome.
- `history-open-002-et` History/OPEN: Ajalugu: Millised vaited on oiged? Teemavihe: Viking Age.
- `history-open-003-et` History/OPEN: Ajalugu: Vali koik tõesed vaited. Teemavihe: Renaissance.
- `history-open-005-et` History/OPEN: Ajalugu: Millised variandid on oiged? Teemavihe: French Revolution.

#### recycled option pool

- `history-open-001-et` History/OPEN: Ajalugu: Vali tõesed vaited. Teemavihe: Ancient Rome.
- `history-open-002-et` History/OPEN: Ajalugu: Millised vaited on oiged? Teemavihe: Viking Age.
- `history-open-003-et` History/OPEN: Ajalugu: Vali koik tõesed vaited. Teemavihe: Renaissance.
- `history-open-004-et` History/OPEN: Ajalugu: Tuvasta faktivaided. Teemavihe: Industrial Revolution.

