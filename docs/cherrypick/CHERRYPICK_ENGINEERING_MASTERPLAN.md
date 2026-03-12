# CherryPick Engineering Masterplan

## Baseline

Development base:

- `7e9dd69`
- `fix(gameplay): keep host board active across turns`

## Milestones

### M1 - Engine Stabilization

Goal:

- stabilize gameplay engine

Tasks:

- fix answer mismatch
- freeze board UI
- remove PASS logic
- adapt scoring to all-or-nothing

Outcome:

- stable CherryPick gameplay

### M2 - Dataset Pipeline

Goal:

- clean question system

Tasks:

- single dataset source
- enforce 8-answer structure
- validate correct answer mapping

Outcome:

- stable question data

### M3 - Home UX

Goal:

- replace SmartIQ lobby entry

New home:

- PLAY
- JOIN
- HOST

Outcome:

- new entry UX

### M4 - Play Mode

Goal:

- implement single-player mode

Features:

- topic selection
- full game loop
- XP summary

### M5 - Join Mode

Goal:

- players join with code

Features:

- enter code
- enter name
- join session

### M6 - Host Mode

Goal:

- simplified host flow

### M7 - XP System

Goal:

- add progression

Features:

- XP
- levels
- stats

### M8 - Couch Mode

Goal:

- same-screen multiplayer

### M9 - Daily Challenge

Goal:

- add retention mechanics

## Sprint Structure

Sprint length:

- 1 week

### Sprint 1

- M1 + M2

### Sprint 2

- M3

### Sprint 3

- M4

### Sprint 4

- M5

### Sprint 5

- M6

### Sprint 6

- M7

## Development Rules

To avoid drift:

- one milestone per branch
- CI must pass before merge
- manual gameplay test required
