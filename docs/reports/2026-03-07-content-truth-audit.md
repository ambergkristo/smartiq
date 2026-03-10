# Content Truth Audit

## Metadata

- Generated: 2026-03-10T12:27:07.419Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: NOT READY - editorial cleanup required before launch trust | score 0.918 | total issues 640
- ET: BLOCKED - ET is not launch-ready | score 0.798 | total issues 1539

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.918
- Launch readiness: NOT READY - editorial cleanup required before launch trust
- Total issue hits: 640
- Warning count: 640

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 210
- placeholder content: 0
- templated/scaffold wording: 100
- recycled option pool: 330
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN Sports/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Geography/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Culture/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Science/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/ORDER: 30/30 cards flagged (100%) | unnatural_phrasing

### Categorized Findings Summary

#### unnatural phrasing

- `varia-order-001` Varia/ORDER: Varia: Order time units shortest to longest. Use strict ascending order. Theme: Calendar.
- `varia-order-002` Varia/ORDER: Varia: Order file sizes smallest to largest. Place earliest/lowest at rank 1. Theme: Compass.
- `varia-order-003` Varia/ORDER: Varia: Order currency values low to high. Build one correct sequence. Theme: Keyboard.
- `varia-order-004` Varia/ORDER: Varia: Order time units shortest to longest. Rank all options from first to last. Theme: Notebook.

#### templated/scaffold wording

- `sports-true_false-001` Sports/TRUE_FALSE: Sports: Mark statements that are true for this topic. Focus area: Football.
- `sports-true_false-003` Sports/TRUE_FALSE: Sports: Find the statements that fit. Focus area: Tennis.
- `sports-true_false-004` Sports/TRUE_FALSE: Sports: Select all true statements. Focus area: Cricket.
- `sports-true_false-006` Sports/TRUE_FALSE: Sports: Identify valid statements. Focus area: Volleyball.

#### recycled option pool

- `sports-true_false-001` Sports/TRUE_FALSE: Sports: Mark statements that are true for this topic. Focus area: Football.
- `sports-true_false-002` Sports/TRUE_FALSE: Sports: Which claims are accurate? Focus area: Basketball.
- `sports-true_false-003` Sports/TRUE_FALSE: Sports: Find the statements that fit. Focus area: Tennis.
- `sports-true_false-004` Sports/TRUE_FALSE: Sports: Select all true statements. Focus area: Cricket.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.798
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 1539
- Warning count: 1539

### Issue Counts

- language leakage: 130
- broken grammar: 539
- unnatural phrasing: 280
- placeholder content: 0
- templated/scaffold wording: 100
- recycled option pool: 330
- low-trust option wording: 160
- trivial/low-value content: 0

### Highest-Risk Areas

- ET Sports/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Geography/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Culture/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Science/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Varia/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET History/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar

### Categorized Findings Summary

#### language leakage

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### broken grammar

- `sports-true_false-001-et` Sports/TRUE_FALSE: Sport: Margi selle teema toesed vaited. Fookus: Football.
- `sports-true_false-002-et` Sports/TRUE_FALSE: Sport: Millised vaited on oiged? Fookus: Basketball.
- `sports-true_false-003-et` Sports/TRUE_FALSE: Sport: Leia sobivad vaited. Fookus: Tennis.
- `sports-true_false-004-et` Sports/TRUE_FALSE: Sport: Vali koik toed vaited. Fookus: Cricket.

#### unnatural phrasing

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### templated/scaffold wording

- `sports-true_false-001-et` Sports/TRUE_FALSE: Sport: Margi selle teema toesed vaited. Fookus: Football.
- `sports-true_false-003-et` Sports/TRUE_FALSE: Sport: Leia sobivad vaited. Fookus: Tennis.
- `sports-true_false-004-et` Sports/TRUE_FALSE: Sport: Vali koik toed vaited. Fookus: Cricket.
- `sports-true_false-006-et` Sports/TRUE_FALSE: Sport: Tuvasta kehtivad vaited. Fookus: Volleyball.

#### low-trust option wording

- `history-color-001-et` History/COLOR: Ajalugu: Milline varv sobib 'selge paevane taevas'?
- `history-color-002-et` History/COLOR: Ajalugu: Vali varv, mis sobib koige paremini 'varske rohi'.
- `history-color-003-et` History/COLOR: Ajalugu: Vali varv vihjele 'kups banaanikoor'.
- `history-color-004-et` History/COLOR: Ajalugu: 'kups tomat' on koige lahedasem millisele varvile?

#### recycled option pool

- `sports-true_false-001-et` Sports/TRUE_FALSE: Sport: Margi selle teema toesed vaited. Fookus: Football.
- `sports-true_false-002-et` Sports/TRUE_FALSE: Sport: Millised vaited on oiged? Fookus: Basketball.
- `sports-true_false-003-et` Sports/TRUE_FALSE: Sport: Leia sobivad vaited. Fookus: Tennis.
- `sports-true_false-004-et` Sports/TRUE_FALSE: Sport: Vali koik toed vaited. Fookus: Cricket.

