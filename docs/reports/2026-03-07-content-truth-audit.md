# Content Truth Audit

## Metadata

- Generated: 2026-03-10T14:10:52.052Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: NOT READY - editorial cleanup required before launch trust | score 0.933 | total issues 528
- ET: BLOCKED - ET is not launch-ready | score 0.817 | total issues 1396

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.933
- Launch readiness: NOT READY - editorial cleanup required before launch trust
- Total issue hits: 528
- Warning count: 528

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 210
- placeholder content: 0
- templated/scaffold wording: 60
- recycled option pool: 258
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN Varia/TRUE_FALSE: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/ORDER: 30/30 cards flagged (100%) | unnatural_phrasing
- EN History/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Sports/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Geography/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Culture/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing

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
- `geography-true_false-021` Geography/TRUE_FALSE: Geography: Find the statements that fit. Focus area: Canberra.
- `geography-true_false-022` Geography/TRUE_FALSE: Geography: Select all true statements. Focus area: Ottawa.
- `geography-true_false-024` Geography/TRUE_FALSE: Geography: Identify valid statements. Focus area: Seoul.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.817
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 1396
- Warning count: 1396

### Issue Counts

- language leakage: 130
- broken grammar: 509
- unnatural phrasing: 280
- placeholder content: 0
- templated/scaffold wording: 60
- recycled option pool: 257
- low-trust option wording: 160
- trivial/low-value content: 0

### Highest-Risk Areas

- ET Culture/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET Varia/TRUE_FALSE: 30/30 cards flagged (100%) | broken_grammar, recycled_option_pool, template_scaffold
- ET History/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar
- ET Sports/ORDER: 30/30 cards flagged (100%) | language_leakage, unnatural_phrasing, broken_grammar
- ET Geography/ORDER: 30/30 cards flagged (100%) | broken_grammar
- ET Culture/ORDER: 30/30 cards flagged (100%) | broken_grammar

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

- `geography-true_false-021-et` Geography/TRUE_FALSE: Geograafia: Leia sobivad vaited. Fookus: Canberra.
- `geography-true_false-022-et` Geography/TRUE_FALSE: Geograafia: Vali koik toed vaited. Fookus: Ottawa.
- `geography-true_false-024-et` Geography/TRUE_FALSE: Geograafia: Tuvasta kehtivad vaited. Fookus: Seoul.
- `geography-true_false-025-et` Geography/TRUE_FALSE: Geograafia: Margi selle teema toesed vaited. Fookus: Beijing.

