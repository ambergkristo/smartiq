# Content Truth Audit

## Metadata

- Generated: 2026-03-07T20:32:20.186Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: NOT READY - editorial cleanup required before launch trust | score 0.912 | total issues 690
- ET: BLOCKED - ET is not launch-ready | score 0.783 | total issues 1649

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.912
- Launch readiness: NOT READY - editorial cleanup required before launch trust
- Total issue hits: 690
- Warning count: 690

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 210
- placeholder content: 0
- templated/scaffold wording: 120
- recycled option pool: 360
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN History/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Sports/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Geography/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Culture/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Science/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold

### Categorized Findings Summary

#### unnatural phrasing

- `varia-order-001` Varia/ORDER: Varia: Order time units shortest to longest. Use strict ascending order. Theme: Calendar.
- `varia-order-002` Varia/ORDER: Varia: Order file sizes smallest to largest. Place earliest/lowest at rank 1. Theme: Compass.
- `varia-order-003` Varia/ORDER: Varia: Order currency values low to high. Build one correct sequence. Theme: Keyboard.
- `varia-order-004` Varia/ORDER: Varia: Order time units shortest to longest. Rank all options from first to last. Theme: Notebook.

#### templated/scaffold wording

- `history-true_false-001` History/TRUE_FALSE: History: Mark statements that are true for this topic. Focus area: Ancient Rome.
- `history-true_false-003` History/TRUE_FALSE: History: Find the statements that fit. Focus area: Renaissance.
- `history-true_false-004` History/TRUE_FALSE: History: Select all true statements. Focus area: Industrial Revolution.
- `history-true_false-006` History/TRUE_FALSE: History: Identify valid statements. Focus area: Silk Road.

#### recycled option pool

- `history-true_false-001` History/TRUE_FALSE: History: Mark statements that are true for this topic. Focus area: Ancient Rome.
- `history-true_false-002` History/TRUE_FALSE: History: Which claims are accurate? Focus area: Viking Age.
- `history-true_false-003` History/TRUE_FALSE: History: Find the statements that fit. Focus area: Renaissance.
- `history-true_false-004` History/TRUE_FALSE: History: Select all true statements. Focus area: Industrial Revolution.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.783
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 1649
- Warning count: 1649

### Issue Counts

- language leakage: 160
- broken grammar: 569
- unnatural phrasing: 280
- placeholder content: 0
- templated/scaffold wording: 120
- recycled option pool: 360
- low-trust option wording: 160
- trivial/low-value content: 0

### Highest-Risk Areas

- ET History/TRUE_FALSE: 30/30 cards flagged (100%) | language_leakage, broken_grammar, recycled_option_pool
- ET Sports/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Geography/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Culture/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Science/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Varia/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold

### Categorized Findings Summary

#### language leakage

- `history-true_false-001-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Ancient Rome.
- `history-true_false-002-et` History/TRUE_FALSE: Ajalugu: Millised vaited on oiged? Fookus: Viking Age.
- `history-true_false-003-et` History/TRUE_FALSE: Ajalugu: Leia sobivad vaited. Fookus: Renaissance.
- `history-true_false-004-et` History/TRUE_FALSE: Ajalugu: Vali koik toed vaited. Fookus: Industrial Revolution.

#### broken grammar

- `history-true_false-001-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Ancient Rome.
- `history-true_false-002-et` History/TRUE_FALSE: Ajalugu: Millised vaited on oiged? Fookus: Viking Age.
- `history-true_false-003-et` History/TRUE_FALSE: Ajalugu: Leia sobivad vaited. Fookus: Renaissance.
- `history-true_false-004-et` History/TRUE_FALSE: Ajalugu: Vali koik toed vaited. Fookus: Industrial Revolution.

#### unnatural phrasing

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### templated/scaffold wording

- `history-true_false-001-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Ancient Rome.
- `history-true_false-003-et` History/TRUE_FALSE: Ajalugu: Leia sobivad vaited. Fookus: Renaissance.
- `history-true_false-004-et` History/TRUE_FALSE: Ajalugu: Vali koik toed vaited. Fookus: Industrial Revolution.
- `history-true_false-006-et` History/TRUE_FALSE: Ajalugu: Tuvasta kehtivad vaited. Fookus: Silk Road.

#### low-trust option wording

- `history-color-001-et` History/COLOR: Ajalugu: Milline varv sobib 'selge paevane taevas'?
- `history-color-002-et` History/COLOR: Ajalugu: Vali varv, mis sobib koige paremini 'varske rohi'.
- `history-color-003-et` History/COLOR: Ajalugu: Vali varv vihjele 'kups banaanikoor'.
- `history-color-004-et` History/COLOR: Ajalugu: 'kups tomat' on koige lahedasem millisele varvile?

#### recycled option pool

- `history-true_false-001-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Ancient Rome.
- `history-true_false-002-et` History/TRUE_FALSE: Ajalugu: Millised vaited on oiged? Fookus: Viking Age.
- `history-true_false-003-et` History/TRUE_FALSE: Ajalugu: Leia sobivad vaited. Fookus: Renaissance.
- `history-true_false-004-et` History/TRUE_FALSE: Ajalugu: Vali koik toed vaited. Fookus: Industrial Revolution.

