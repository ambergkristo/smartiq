# Content Truth Audit

## Metadata

- Generated: 2026-03-10T15:18:36.515Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: CONDITIONAL - editorial cleanup still required | score 0.954 | total issues 360
- ET: BLOCKED - ET is not launch-ready | score 0.889 | total issues 849

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.954
- Launch readiness: CONDITIONAL - editorial cleanup still required
- Total issue hits: 360
- Warning count: 360

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 180
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 180
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN History/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Sports/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Geography/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Culture/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Science/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing
- EN Varia/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing

### Categorized Findings Summary

#### unnatural phrasing

- `history-color-001` History/COLOR: History: Which color matches 'clear daytime sky'?
- `history-color-002` History/COLOR: History: Pick the color best matching 'fresh grass'.
- `history-color-003` History/COLOR: History: Select the color for 'ripe banana peel'.
- `history-color-004` History/COLOR: History: 'ripe tomato' is closest to which color?

#### recycled option pool

- `history-open-001` History/OPEN: History: Select statements that are true. Topic clue: Ancient Rome.
- `history-open-002` History/OPEN: History: Which statements are correct? Topic clue: Viking Age.
- `history-open-003` History/OPEN: History: Pick all true statements. Topic clue: Renaissance.
- `history-open-004` History/OPEN: History: Identify factual statements. Topic clue: Industrial Revolution.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.889
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 849
- Warning count: 849

### Issue Counts

- language leakage: 30
- broken grammar: 299
- unnatural phrasing: 180
- placeholder content: 0
- templated/scaffold wording: 0
- recycled option pool: 180
- low-trust option wording: 160
- trivial/low-value content: 0

### Highest-Risk Areas

- ET History/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing, low_trust_option, broken_grammar
- ET Sports/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing, broken_grammar, low_trust_option
- ET Geography/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing, broken_grammar, low_trust_option
- ET Culture/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing, low_trust_option, broken_grammar
- ET Science/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing, low_trust_option, broken_grammar
- ET Varia/COLOR: 30/30 cards flagged (100%) | unnatural_phrasing, low_trust_option, broken_grammar

### Categorized Findings Summary

#### language leakage

- `history-open-001-et` History/OPEN: Ajalugu: Vali tõesed vaited. Teemavihe: Ancient Rome.
- `history-open-002-et` History/OPEN: Ajalugu: Millised vaited on oiged? Teemavihe: Viking Age.
- `history-open-003-et` History/OPEN: Ajalugu: Vali koik tõesed vaited. Teemavihe: Renaissance.
- `history-open-004-et` History/OPEN: Ajalugu: Tuvasta faktivaided. Teemavihe: Industrial Revolution.

#### broken grammar

- `history-number-001-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Ancient Rome.
- `history-number-007-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Magna Carta.
- `history-number-013-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Alexander the Great.
- `history-number-019-et` History/NUMBER: Ajalugu: Mis aastal loppes Teine maailmasoda? Kontekst: Treaty of Versailles.

#### unnatural phrasing

- `history-color-001-et` History/COLOR: Ajalugu: Milline varv sobib 'selge paevane taevas'?
- `history-color-002-et` History/COLOR: Ajalugu: Vali varv, mis sobib koige paremini 'varske rohi'.
- `history-color-003-et` History/COLOR: Ajalugu: Vali varv vihjele 'kups banaanikoor'.
- `history-color-004-et` History/COLOR: Ajalugu: 'kups tomat' on koige lahedasem millisele varvile?

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

