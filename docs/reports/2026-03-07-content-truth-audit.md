# Content Truth Audit

## Metadata

- Generated: 2026-03-10T15:02:56.828Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: CONDITIONAL - editorial cleanup still required | score 0.951 | total issues 390
- ET: BLOCKED - ET is not launch-ready | score 0.850 | total issues 1139

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.951
- Launch readiness: CONDITIONAL - editorial cleanup still required
- Total issue hits: 390
- Warning count: 390

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 210
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 180
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

#### recycled option pool

- `history-open-001` History/OPEN: History: Select statements that are true. Topic clue: Ancient Rome.
- `history-open-002` History/OPEN: History: Which statements are correct? Topic clue: Viking Age.
- `history-open-003` History/OPEN: History: Pick all true statements. Topic clue: Renaissance.
- `history-open-004` History/OPEN: History: Identify factual statements. Topic clue: Industrial Revolution.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.850
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 1139
- Warning count: 1139

### Issue Counts

- language leakage: 130
- broken grammar: 389
- unnatural phrasing: 280
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 180
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

- `history-number-001-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Ancient Rome.
- `history-number-007-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Magna Carta.
- `history-number-013-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Alexander the Great.
- `history-number-019-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Treaty of Versailles.

#### unnatural phrasing

- `history-order-002-et` History/ORDER: Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.
- `history-order-003-et` History/ORDER: Ajalugu: Order dates from past to recent. Koosta uks korrektne jarjestus. Teema: Renaissance.
- `history-order-005-et` History/ORDER: Ajalugu: Order oldest era to newest. Ara jata uhtegi kohta vahele. Teema: French Revolution.
- `history-order-006-et` History/ORDER: Ajalugu: Order dates from past to recent. Igat kohta kasutatakse tapselt korra. Teema: Silk Road.

#### low-trust option wording

- `history-color-001-et` History/COLOR: Ajalugu: Milline varv sobib 'selge paevane taevas'?
- `history-color-002-et` History/COLOR: Ajalugu: Vali varv, mis sobib koige paremini 'varske rohi'.
- `history-color-003-et` History/COLOR: Ajalugu: Vali varv vihjele 'kups banaanikoor'.
- `history-color-004-et` History/COLOR: Ajalugu: 'kups tomat' on koige lahedasem millisele varvile?

#### recycled option pool

- `history-open-001-et` History/OPEN: Ajalugu: Vali tõesed vaited. Teemavihe: Ancient Rome.
- `history-open-002-et` History/OPEN: Ajalugu: Millised vaited on oiged? Teemavihe: Viking Age.
- `history-open-003-et` History/OPEN: Ajalugu: Vali koik tõesed vaited. Teemavihe: Renaissance.
- `history-open-004-et` History/OPEN: Ajalugu: Tuvasta faktivaided. Teemavihe: Industrial Revolution.

