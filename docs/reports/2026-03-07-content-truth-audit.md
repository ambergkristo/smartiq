# Content Truth Audit

## Metadata

- Generated: 2026-03-10T14:56:31.656Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: NOT READY - editorial cleanup required before launch trust | score 0.946 | total issues 423
- ET: BLOCKED - ET is not launch-ready | score 0.842 | total issues 1202

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.946
- Launch readiness: NOT READY - editorial cleanup required before launch trust
- Total issue hits: 423
- Warning count: 423

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 210
- placeholder content: 0
- templated/scaffold wording: 13
- recycled option pool: 200
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN Varia/ORDER: 30/30 cards flagged (100%) | unnatural_phrasing
- EN History/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Sports/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Geography/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Culture/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Science/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing

### Categorized Findings Summary

#### unnatural phrasing

- `varia-order-001` Varia/ORDER: Varia: Order time units shortest to longest. Use strict ascending order. Theme: Calendar.
- `varia-order-002` Varia/ORDER: Varia: Order file sizes smallest to largest. Place earliest/lowest at rank 1. Theme: Compass.
- `varia-order-003` Varia/ORDER: Varia: Order currency values low to high. Build one correct sequence. Theme: Keyboard.
- `varia-order-004` Varia/ORDER: Varia: Order time units shortest to longest. Rank all options from first to last. Theme: Notebook.

#### templated/scaffold wording

- `science-true_false-012` Science/TRUE_FALSE: Science: Identify valid statements. Focus area: Entropy.
- `science-true_false-013` Science/TRUE_FALSE: Science: Mark statements that are true for this topic. Focus area: Oxygen.
- `science-true_false-015` Science/TRUE_FALSE: Science: Find the statements that fit. Focus area: Nitrogen.
- `science-true_false-016` Science/TRUE_FALSE: Science: Select all true statements. Focus area: Carbon.

#### recycled option pool

- `science-true_false-011` Science/TRUE_FALSE: Science: Which lines are correct? Focus area: Energy.
- `science-true_false-012` Science/TRUE_FALSE: Science: Identify valid statements. Focus area: Entropy.
- `science-true_false-013` Science/TRUE_FALSE: Science: Mark statements that are true for this topic. Focus area: Oxygen.
- `science-true_false-014` Science/TRUE_FALSE: Science: Which claims are accurate? Focus area: Hydrogen.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.842
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 1202
- Warning count: 1202

### Issue Counts

- language leakage: 130
- broken grammar: 419
- unnatural phrasing: 280
- placeholder content: 0
- templated/scaffold wording: 13
- recycled option pool: 200
- low-trust option wording: 160
- trivial/low-value content: 0

### Highest-Risk Areas

- ET History/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar
- ET Sports/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar
- ET Geography/ORDER: 30/30 cards flagged (100%) | broken_grammar
- ET Culture/ORDER: 30/30 cards flagged (100%) | broken_grammar
- ET Science/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar
- ET Varia/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar

### Categorized Findings Summary

#### language leakage

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### broken grammar

- `sports-true_false-011-et` Sports/TRUE_FALSE: Sport: Millised v?ited lauatennise kohta peavad paika?
- `sports-true_false-012-et` Sports/TRUE_FALSE: Sport: Millised v?ited kergej?ustiku kohta peavad paika?
- `sports-true_false-013-et` Sports/TRUE_FALSE: Sport: Millised v?ited ujumise kohta peavad paika?
- `sports-true_false-014-et` Sports/TRUE_FALSE: Sport: Millised v?ited rattas?idu kohta peavad paika?

#### unnatural phrasing

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### templated/scaffold wording

- `science-true_false-012-et` Science/TRUE_FALSE: Teadus: Tuvasta kehtivad vaited. Fookus: Entropy.
- `science-true_false-013-et` Science/TRUE_FALSE: Teadus: Margi selle teema toesed vaited. Fookus: Oxygen.
- `science-true_false-015-et` Science/TRUE_FALSE: Teadus: Leia sobivad vaited. Fookus: Nitrogen.
- `science-true_false-016-et` Science/TRUE_FALSE: Teadus: Vali koik toed vaited. Fookus: Carbon.

#### low-trust option wording

- `history-color-001-et` History/COLOR: Ajalugu: Milline varv sobib 'selge paevane taevas'?
- `history-color-002-et` History/COLOR: Ajalugu: Vali varv, mis sobib koige paremini 'varske rohi'.
- `history-color-003-et` History/COLOR: Ajalugu: Vali varv vihjele 'kups banaanikoor'.
- `history-color-004-et` History/COLOR: Ajalugu: 'kups tomat' on koige lahedasem millisele varvile?

#### recycled option pool

- `science-true_false-011-et` Science/TRUE_FALSE: Teadus: Millised read on oiged? Fookus: Energy.
- `science-true_false-012-et` Science/TRUE_FALSE: Teadus: Tuvasta kehtivad vaited. Fookus: Entropy.
- `science-true_false-013-et` Science/TRUE_FALSE: Teadus: Margi selle teema toesed vaited. Fookus: Oxygen.
- `science-true_false-014-et` Science/TRUE_FALSE: Teadus: Millised vaited on oiged? Fookus: Hydrogen.

