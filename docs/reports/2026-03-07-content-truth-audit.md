# Content Truth Audit

## Metadata

- Generated: 2026-03-07T20:50:50.548Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: NOT READY - editorial cleanup required before launch trust | score 0.914 | total issues 673
- ET: BLOCKED - ET is not launch-ready | score 0.788 | total issues 1612

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.914
- Launch readiness: NOT READY - editorial cleanup required before launch trust
- Total issue hits: 673
- Warning count: 673

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 210
- placeholder content: 0
- templated/scaffold wording: 113
- recycled option pool: 350
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

- `history-true_false-012` History/TRUE_FALSE: History: Identify valid statements. Focus area: Julius Caesar.
- `history-true_false-013` History/TRUE_FALSE: History: Mark statements that are true for this topic. Focus area: Alexander the Great.
- `history-true_false-015` History/TRUE_FALSE: History: Find the statements that fit. Focus area: Roman Republic.
- `history-true_false-016` History/TRUE_FALSE: History: Select all true statements. Focus area: Cold War.

#### recycled option pool

- `history-true_false-011` History/TRUE_FALSE: History: Which lines are correct? Focus area: Napoleon.
- `history-true_false-012` History/TRUE_FALSE: History: Identify valid statements. Focus area: Julius Caesar.
- `history-true_false-013` History/TRUE_FALSE: History: Mark statements that are true for this topic. Focus area: Alexander the Great.
- `history-true_false-014` History/TRUE_FALSE: History: Which claims are accurate? Focus area: Gutenberg Press.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.788
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 1612
- Warning count: 1612

### Issue Counts

- language leakage: 150
- broken grammar: 559
- unnatural phrasing: 280
- placeholder content: 0
- templated/scaffold wording: 113
- recycled option pool: 350
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

- `history-true_false-011-et` History/TRUE_FALSE: Ajalugu: Millised read on oiged? Fookus: Napoleon.
- `history-true_false-012-et` History/TRUE_FALSE: Ajalugu: Tuvasta kehtivad vaited. Fookus: Julius Caesar.
- `history-true_false-013-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Alexander the Great.
- `history-true_false-014-et` History/TRUE_FALSE: Ajalugu: Millised vaited on oiged? Fookus: Gutenberg Press.

#### broken grammar

- `history-true_false-011-et` History/TRUE_FALSE: Ajalugu: Millised read on oiged? Fookus: Napoleon.
- `history-true_false-012-et` History/TRUE_FALSE: Ajalugu: Tuvasta kehtivad vaited. Fookus: Julius Caesar.
- `history-true_false-013-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Alexander the Great.
- `history-true_false-014-et` History/TRUE_FALSE: Ajalugu: Millised vaited on oiged? Fookus: Gutenberg Press.

#### unnatural phrasing

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### templated/scaffold wording

- `history-true_false-012-et` History/TRUE_FALSE: Ajalugu: Tuvasta kehtivad vaited. Fookus: Julius Caesar.
- `history-true_false-013-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Alexander the Great.
- `history-true_false-015-et` History/TRUE_FALSE: Ajalugu: Leia sobivad vaited. Fookus: Roman Republic.
- `history-true_false-016-et` History/TRUE_FALSE: Ajalugu: Vali koik toed vaited. Fookus: Cold War.

#### low-trust option wording

- `history-color-001-et` History/COLOR: Ajalugu: Milline varv sobib 'selge paevane taevas'?
- `history-color-002-et` History/COLOR: Ajalugu: Vali varv, mis sobib koige paremini 'varske rohi'.
- `history-color-003-et` History/COLOR: Ajalugu: Vali varv vihjele 'kups banaanikoor'.
- `history-color-004-et` History/COLOR: Ajalugu: 'kups tomat' on koige lahedasem millisele varvile?

#### recycled option pool

- `history-true_false-011-et` History/TRUE_FALSE: Ajalugu: Millised read on oiged? Fookus: Napoleon.
- `history-true_false-012-et` History/TRUE_FALSE: Ajalugu: Tuvasta kehtivad vaited. Fookus: Julius Caesar.
- `history-true_false-013-et` History/TRUE_FALSE: Ajalugu: Margi selle teema toesed vaited. Fookus: Alexander the Great.
- `history-true_false-014-et` History/TRUE_FALSE: Ajalugu: Millised vaited on oiged? Fookus: Gutenberg Press.

