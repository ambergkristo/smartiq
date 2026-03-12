# M9 — Architecture Cleanup

## Purpose

Remove structural bottlenecks that make SmartIQ harder to evolve safely.

## Technical Scope

- Split oversized orchestration components and services
- Clarify boundaries between gameplay, multiplayer, content, host tools, and SaaS concerns
- Reduce coupling between product surfaces
- Align documentation with actual system behavior

## Product Impact

- Speeds up future delivery
- Lowers regression risk
- Makes milestone execution more predictable

## Definition of Done

- Core modules have clearer ownership
- High-risk god objects are reduced
- Product docs and implementation boundaries no longer contradict each other
> This document was archived after the project pivot from SmartIQ to CherryPick.
