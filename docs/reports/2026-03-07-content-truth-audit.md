# Content Truth Audit

## Metadata

- Generated: 2026-03-10T12:44:08.275Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: NOT READY - editorial cleanup required before launch trust | score 0.924 | total issues 598
- ET: BLOCKED - ET is not launch-ready | score 0.806 | total issues 1476

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.924
- Launch readiness: NOT READY - editorial cleanup required before launch trust
- Total issue hits: 598
- Warning count: 598

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 210
- placeholder content: 0
- templated/scaffold wording: 87
- recycled option pool: 301
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN Geography/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Culture/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Science/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/ORDER: 30/30 cards flagged (100%) | unnatural_phrasing
- EN History/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing

### Categorized Findings Summary

#### unnatural phrasing

- `varia-order-001` Varia/ORDER: Varia: Order time units shortest to longest. Use strict ascending order. Theme: Calendar.
- `varia-order-002` Varia/ORDER: Varia: Order file sizes smallest to largest. Place earliest/lowest at rank 1. Theme: Compass.
- `varia-order-003` Varia/ORDER: Varia: Order currency values low to high. Build one correct sequence. Theme: Keyboard.
- `varia-order-004` Varia/ORDER: Varia: Order time units shortest to longest. Rank all options from first to last. Theme: Notebook.

#### templated/scaffold wording

- `sports-true_false-021` Sports/TRUE_FALSE: Sports: Find the statements that fit. Focus area: Formula One.
- `sports-true_false-022` Sports/TRUE_FALSE: Sports: Select all true statements. Focus area: MotoGP.
- `sports-true_false-024` Sports/TRUE_FALSE: Sports: Identify valid statements. Focus area: Triathlon.
- `sports-true_false-025` Sports/TRUE_FALSE: Sports: Mark statements that are true for this topic. Focus area: Decathlon.

#### recycled option pool

- `sports-true_false-028` Sports/TRUE_FALSE: Sports: Select all true statements. Focus area: World Cup.
- `geography-true_false-001` Geography/TRUE_FALSE: Geography: Mark statements that are true for this topic. Focus area: Tallinn.
- `geography-true_false-002` Geography/TRUE_FALSE: Geography: Which claims are accurate? Focus area: Riga.
- `geography-true_false-003` Geography/TRUE_FALSE: Geography: Find the statements that fit. Focus area: Vilnius.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.806
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 1476
- Warning count: 1476

### Issue Counts

- language leakage: 130
- broken grammar: 519
- unnatural phrasing: 280
- placeholder content: 0
- templated/scaffold wording: 87
- recycled option pool: 300
- low-trust option wording: 160
- trivial/low-value content: 0

### Highest-Risk Areas

- ET Geography/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Culture/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Science/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Varia/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET History/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar
- ET Sports/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar

### Categorized Findings Summary

#### language leakage

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### broken grammar

- `sports-true_false-021-et` Sports/TRUE_FALSE: Sport: Leia sobivad vaited. Fookus: Formula One.
- `sports-true_false-022-et` Sports/TRUE_FALSE: Sport: Vali koik toed vaited. Fookus: MotoGP.
- `sports-true_false-023-et` Sports/TRUE_FALSE: Sport: Millised read on oiged? Fookus: Marathon.
- `sports-true_false-024-et` Sports/TRUE_FALSE: Sport: Tuvasta kehtivad vaited. Fookus: Triathlon.

#### unnatural phrasing

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### templated/scaffold wording

- `sports-true_false-021-et` Sports/TRUE_FALSE: Sport: Leia sobivad vaited. Fookus: Formula One.
- `sports-true_false-022-et` Sports/TRUE_FALSE: Sport: Vali koik toed vaited. Fookus: MotoGP.
- `sports-true_false-024-et` Sports/TRUE_FALSE: Sport: Tuvasta kehtivad vaited. Fookus: Triathlon.
- `sports-true_false-025-et` Sports/TRUE_FALSE: Sport: Margi selle teema toesed vaited. Fookus: Decathlon.

#### low-trust option wording

- `history-color-001-et` History/COLOR: Ajalugu: Milline varv sobib 'selge paevane taevas'?
- `history-color-002-et` History/COLOR: Ajalugu: Vali varv, mis sobib koige paremini 'varske rohi'.
- `history-color-003-et` History/COLOR: Ajalugu: Vali varv vihjele 'kups banaanikoor'.
- `history-color-004-et` History/COLOR: Ajalugu: 'kups tomat' on koige lahedasem millisele varvile?

#### recycled option pool

- `geography-true_false-001-et` Geography/TRUE_FALSE: Geograafia: Margi selle teema toesed vaited. Fookus: Tallinn.
- `geography-true_false-002-et` Geography/TRUE_FALSE: Geograafia: Millised vaited on oiged? Fookus: Riga.
- `geography-true_false-003-et` Geography/TRUE_FALSE: Geograafia: Leia sobivad vaited. Fookus: Vilnius.
- `geography-true_false-004-et` Geography/TRUE_FALSE: Geograafia: Vali koik toed vaited. Fookus: Helsinki.

