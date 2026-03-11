# Suffix Repair Verification Pack

## Metadata

- Date: 2026-03-11
- Repair commit: `5ec07c7`
- Scope: targeted manual verification for Theme/Context/Kontekst/Teema suffix cleanup only
- Sample rule: for each locale, use fixed topic/category buckets and pick the first repaired card by `cardId` within each bucket
- Buckets: `History/NUMBER`, `Sports/NUMBER`, `Geography/ORDER`, `Culture/NUMBER`, `Science/ORDER`
- Review outcomes: `PASS`, `PASS_WITH_NOTE`, `NEEDS_REPAIR`
- Overall status: `PASS`
- Review note: targeted human editorial verification completed; suffix-repair loop cleared

## Review Scaffold

## EN Sample

| Card ID | Previous suffix | Topic/Category | Repaired question | Outcome | Note |
| --- | --- | --- | --- | --- | --- |
| history-number-001 | Context tag: | History/NUMBER | History: In which year did WWII end? | PASS | Suffix artifact absent in live reading. |
| sports-number-001 | Context tag: | Sports/NUMBER | Sports: Players on football team on field? | PASS | Suffix artifact absent in live reading. |
| geography-order-001 | Theme: | Geography/ORDER | Geography: Put these countries in order by area, smallest first. | PASS | Suffix artifact absent in live reading. |
| culture-number-001 | Context tag: | Culture/NUMBER | Culture: How many strings on a violin? | PASS | Suffix artifact absent in live reading. |
| science-order-001 | Theme: | Science/ORDER | Science: Put these planets in order from the Sun outward. | PASS | Suffix artifact absent in live reading. |

### history-number-001

- Locale: `EN`
- Topic/category: `History/NUMBER`
- Previous suffix type: `Context tag:`
- Previous question: History: In which year did WWII end? Context tag: Ancient Rome.
- Repaired question: History: In which year did WWII end?
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### sports-number-001

- Locale: `EN`
- Topic/category: `Sports/NUMBER`
- Previous suffix type: `Context tag:`
- Previous question: Sports: Players on football team on field? Context tag: Football.
- Repaired question: Sports: Players on football team on field?
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### geography-order-001

- Locale: `EN`
- Topic/category: `Geography/ORDER`
- Previous suffix type: `Theme:`
- Previous question: Geography: Put these countries in order by area, smallest first. Theme: Tallinn.
- Repaired question: Geography: Put these countries in order by area, smallest first.
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### culture-number-001

- Locale: `EN`
- Topic/category: `Culture/NUMBER`
- Previous suffix type: `Context tag:`
- Previous question: Culture: How many strings on a violin? Context tag: Mona Lisa.
- Repaired question: Culture: How many strings on a violin?
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### science-order-001

- Locale: `EN`
- Topic/category: `Science/ORDER`
- Previous suffix type: `Theme:`
- Previous question: Science: Put these planets in order from the Sun outward. Theme: Atom.
- Repaired question: Science: Put these planets in order from the Sun outward.
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

## ET Sample

| Card ID | Previous suffix | Topic/Category | Repaired question | Outcome | Note |
| --- | --- | --- | --- | --- | --- |
| history-number-001-et | Kontekst: | History/NUMBER | Ajalugu: Mis aastal lõppes Teine maailmasõda? | PASS | Suffix artifact absent in live reading. |
| sports-number-001-et | Kontekst: | Sports/NUMBER | Sport: Mitu mangijat on jalgpallitiimis valjakul? | PASS | Suffix artifact absent in live reading. |
| geography-order-001-et | Teema: | Geography/ORDER | Geograafia: Pane need riigid pindala järgi järjekorda, väikseim ette. | PASS | Suffix artifact absent in live reading. |
| culture-number-001-et | Kontekst: | Culture/NUMBER | Kultuur: Mitu keelt on viiulil? | PASS | Suffix artifact absent in live reading. |
| science-order-001-et | Teema: | Science/ORDER | Teadus: Pane need planeedid järjekorda Päikesest väljapoole. | PASS | Suffix artifact absent in live reading. |

### history-number-001-et

- Locale: `ET`
- Topic/category: `History/NUMBER`
- Previous suffix type: `Kontekst:`
- Previous question: Ajalugu: Mis aastal lõppes Teine maailmasõda? Kontekst: Vana-Rooma.
- Repaired question: Ajalugu: Mis aastal lõppes Teine maailmasõda?
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### sports-number-001-et

- Locale: `ET`
- Topic/category: `Sports/NUMBER`
- Previous suffix type: `Kontekst:`
- Previous question: Sport: Mitu mangijat on jalgpallitiimis valjakul? Kontekst: Football.
- Repaired question: Sport: Mitu mangijat on jalgpallitiimis valjakul?
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### geography-order-001-et

- Locale: `ET`
- Topic/category: `Geography/ORDER`
- Previous suffix type: `Teema:`
- Previous question: Geograafia: Pane need riigid pindala järgi järjekorda, väikseim ette. Teema: Tallinn.
- Repaired question: Geograafia: Pane need riigid pindala järgi järjekorda, väikseim ette.
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### culture-number-001-et

- Locale: `ET`
- Topic/category: `Culture/NUMBER`
- Previous suffix type: `Kontekst:`
- Previous question: Kultuur: Mitu keelt on viiulil? Kontekst: Mona Lisa.
- Repaired question: Kultuur: Mitu keelt on viiulil?
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.

### science-order-001-et

- Locale: `ET`
- Topic/category: `Science/ORDER`
- Previous suffix type: `Teema:`
- Previous question: Teadus: Pane need planeedid järjekorda Päikesest väljapoole. Teema: Aatom.
- Repaired question: Teadus: Pane need planeedid järjekorda Päikesest väljapoole.
- Outcome: `PASS`
- Reviewer note: Suffix artifact absent in live reading.
