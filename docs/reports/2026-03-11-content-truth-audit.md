# Content Truth Audit

## Metadata

- Generated: 2026-03-11T07:15:06.255Z
- Scope: EN, ET SmartIQ locale packs

## Executive Summary

- EN: CONDITIONAL - editorial cleanup still required | score 0.987 | total issues 100
- ET: BLOCKED - ET is not launch-ready | score 0.983 | total issues 130

## EN Findings

- Dataset: `data/smart10/cards.en.json`
- Semantic content score: 0.987
- Launch readiness: CONDITIONAL - editorial cleanup still required
- Total issue hits: 100
- Warning count: 100

### Issue Counts

- language leakage: 0
- broken grammar: 0
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 40
- recycled option pool: 60
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- EN Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, template_scaffold
- EN History/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- EN Sports/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- EN Geography/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- EN Culture/TRUE_FALSE: 0/30 cards flagged (0%) | n/a

### Categorized Findings Summary

#### templated/scaffold wording

- `science-open-001` Science/OPEN: Science: Select statements that are true. Topic clue: Atom.
- `science-open-002` Science/OPEN: Science: Which statements are correct? Topic clue: Molecule.
- `science-open-003` Science/OPEN: Science: Pick all true statements. Topic clue: Electron.
- `science-open-004` Science/OPEN: Science: Identify factual statements. Topic clue: Proton.

#### recycled option pool

- `science-open-001` Science/OPEN: Science: Select statements that are true. Topic clue: Atom.
- `science-open-002` Science/OPEN: Science: Which statements are correct? Topic clue: Molecule.
- `science-open-003` Science/OPEN: Science: Pick all true statements. Topic clue: Electron.
- `science-open-004` Science/OPEN: Science: Identify factual statements. Topic clue: Proton.


## ET Findings

- Dataset: `data/smart10/cards.et.json`
- Semantic content score: 0.983
- Launch readiness: BLOCKED - ET is not launch-ready
- Total issue hits: 130
- Warning count: 130

### Issue Counts

- language leakage: 0
- broken grammar: 50
- unnatural phrasing: 0
- placeholder content: 0
- templated/scaffold wording: 20
- recycled option pool: 60
- low-trust option wording: 0
- trivial/low-value content: 0

### Highest-Risk Areas

- ET Science/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar, template_scaffold
- ET Varia/OPEN: 30/30 cards flagged (100%) | recycled_option_pool, broken_grammar, template_scaffold
- ET History/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- ET Sports/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- ET Geography/TRUE_FALSE: 0/30 cards flagged (0%) | n/a
- ET Culture/TRUE_FALSE: 0/30 cards flagged (0%) | n/a

### Categorized Findings Summary

#### broken grammar

- `science-open-001-et` Science/OPEN: Teadus: Vali tõesed vaited. Teemavihe: Atom.
- `science-open-002-et` Science/OPEN: Teadus: Millised vaited on oiged? Teemavihe: Molecule.
- `science-open-003-et` Science/OPEN: Teadus: Vali koik tõesed vaited. Teemavihe: Electron.
- `science-open-005-et` Science/OPEN: Teadus: Millised variandid on oiged? Teemavihe: Neutron.

#### templated/scaffold wording

- `science-open-002-et` Science/OPEN: Teadus: Millised vaited on oiged? Teemavihe: Molecule.
- `science-open-005-et` Science/OPEN: Teadus: Millised variandid on oiged? Teemavihe: Neutron.
- `science-open-008-et` Science/OPEN: Teadus: Millised vaited on oiged? Teemavihe: Velocity.
- `science-open-011-et` Science/OPEN: Teadus: Millised variandid on oiged? Teemavihe: Energy.

#### recycled option pool

- `science-open-001-et` Science/OPEN: Teadus: Vali tõesed vaited. Teemavihe: Atom.
- `science-open-002-et` Science/OPEN: Teadus: Millised vaited on oiged? Teemavihe: Molecule.
- `science-open-003-et` Science/OPEN: Teadus: Vali koik tõesed vaited. Teemavihe: Electron.
- `science-open-004-et` Science/OPEN: Teadus: Tuvasta faktivaided. Teemavihe: Proton.

