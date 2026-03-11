# SmartIQ Masterplan

## Product Vision

SmartIQ is a recurring quiz night SaaS platform where hosts can run quiz games for live audiences using SmartIQ.

The product must evolve from a host-operated playable system into a repeatable, commercially viable platform that hosts can trust and reuse.

## System Layers

### Layer 1 — Gameplay Engine

Responsibility:
- Own the turn model, answer resolution, scoring, round flow, and board behavior.
- Protect game integrity and deterministic outcome handling.

### Layer 2 — Multiplayer Infrastructure

Responsibility:
- Own room lifecycle, join/rejoin, realtime synchronization, reconnect behavior, and multiplayer state consistency.
- Make public games reliable before scaling traffic or monetization.

### Layer 3 — Host Tools

Responsibility:
- Own game setup, launch flow, session control, round control, templates, and host operational workflows.
- Reduce host friction and increase repeat usage.

### Layer 4 — Content System

Responsibility:
- Own card inventory, topic coverage, editorial quality, localization, content review, and future pack management.
- Ensure the game has enough reliable content depth to support recurring use.

### Layer 5 — SaaS Platform

Responsibility:
- Own tenant identity, billing, entitlements, analytics, branding, retention signals, and commercial controls.
- Monetize only after gameplay and multiplayer reliability are strong enough to justify payment.
