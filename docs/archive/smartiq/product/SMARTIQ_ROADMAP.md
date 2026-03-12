> This document was archived after the project pivot from SmartIQ to CherryPick.

# SmartIQ Roadmap

## M8 — Realtime Integrity

### Purpose

Make multiplayer behavior reliable enough for live games.

### Scope

- Realtime room state consistency
- Join, rejoin, and reconnect reliability
- Host and player state synchronization
- Room and game session correctness under deployment conditions

### Success Criteria

- Live room state updates are dependable
- Rejoin and reconnect flows recover session continuity
- Multiplayer state remains consistent during normal public play

## M9 — Architecture Cleanup

### Purpose

Reduce architectural drag so future product work does not slow down or break unrelated behavior.

### Scope

- Split oversized frontend orchestration
- Reduce backend god services
- Clarify ownership boundaries between gameplay, multiplayer, host tools, and SaaS concerns
- Remove documentation ambiguity around active product flow

### Success Criteria

- Core product areas have clearer module boundaries
- New work can be added with less coupling
- Product documentation matches system reality

## M10 — Commercial Host Core

### Purpose

Make the host workflow strong enough to support repeat professional use.

### Scope

- Host setup simplification
- Session launch and resume reliability
- Practical session history and host workflow support
- Entitlement rules aligned to host-facing value

### Success Criteria

- Hosts can repeatedly create, launch, resume, and review sessions with low friction
- Paid-value host features are clearly defined and defensible
- Host workflow feels production-oriented instead of experimental

## M11 — Content Engine

### Purpose

Build the content supply system required for recurring play and future monetization.

### Scope

- Larger validated card inventory
- Editorial quality process
- Localization consistency
- Content packaging and management structure

### Success Criteria

- Content depth supports repeated use without rapid fatigue
- Editorial quality is controlled, not ad hoc
- Content operations are scalable beyond manual JSON maintenance

## M12 — Monetization Proof

### Purpose

Prove that SmartIQ can convert host value into real recurring revenue.

### Scope

- Activation and retention instrumentation
- Host plan packaging
- Paid pilot structure
- Commercial funnel measurement

### Success Criteria

- Real host usage can be measured across activation, repeat use, and payment
- Pricing is attached to concrete product value
- Monetization decisions are based on observed behavior, not assumption
