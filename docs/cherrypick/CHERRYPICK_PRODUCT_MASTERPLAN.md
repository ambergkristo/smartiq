# CherryPick Product Masterplan

## Product Vision

CherryPick is a hybrid quiz game platform that combines:

- single player trivia
- couch multiplayer
- join-code live quiz
- XP progression
- cherry-based reward mechanics

The game is designed to be:

- fast
- risk-based
- reward-driven

## Core Gameplay

### Question Format

- 1 question
- 8 answers
- 1-N correct

### Board Layout

- 2 x 4 grid

### Round Logic

The player selects answers until:

- all correct answers are found
- or a wrong answer is selected

### Risk Rule

If the player makes a mistake before all correct answers are found:

- XP = 0

### XP Reward

If all correct answers are found:

- XP = base
- plus speed bonus
- multiplied by the cherry multiplier

## Cherry Mechanics

Cherry is a special reward state.

### Cherry Types

- Cherry -> XP x2
- Double Cherry -> XP x3
- Golden Cherry -> XP x1000

### Cherry Spawn

Cherry can appear through:

- random probability
- streak based
- daily challenge

### Golden Cherry

Golden Cherry is a special question state with extremely high reward.

Example:

- Golden Cherry
- XP x1000

## Product Modes

### PLAY

Single-player mode.

Flow:

PLAY
-> topic select
-> game
-> XP summary

### COUCH

2-4 players on the same screen.

Turn-based.

### JOIN

The player enters a game code.

Flow:

enter code
-> enter name
-> join game

### HOST

The host creates a live game.

Flow:

create game
-> code generated
-> players join
-> start

## Identity Model

CherryPick uses a hybrid identity model.

Users can be:

- guest profile
- registered account

## Player Profile

`player_profile`

Fields:

- `id`
- `user_id` (nullable)
- `guest_token`
- `display_name`
- `xp`
- `level`
- `games_played`
- `stats`

## Progression

XP comes from:

- correct answers
- speed bonus
- cherry multipliers

### Levels

Example level ladder:

- 1 Rookie
- 5 Player
- 10 Expert
- 20 Master
- 40 Legend

## Daily Challenge

Each day has a new quiz.

Features:

- daily XP
- golden cherry chance
- leaderboard

## Leaderboards

Leaderboard types:

- daily
- weekly
- all-time
- topic based
