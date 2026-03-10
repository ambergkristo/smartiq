# PPTX FIXER Lint Rules v1

This document is preliminary and should be updated after M0 findings. It is a draft rule catalog only and not implementation.

## Draft Rules

- `RULE_001` Font inconsistency: Detect mismatched font properties within content that should be visually consistent.
- `RULE_002` Bullet spacing drift: Detect inconsistent bullet indentation or bullet-to-text spacing.
- `RULE_003` Paragraph spacing inconsistency: Detect uneven paragraph spacing within repeated text patterns.
- `RULE_004` Text alignment inconsistency: Detect text objects that break expected alignment within the same layout pattern.
- `RULE_005` Object alignment drift: Detect misaligned objects that should share a common grid or edge.
- `RULE_006` Repeated object spacing inconsistency: Detect uneven spacing between repeated peer objects.
- `RULE_007` Color inconsistency: Detect inconsistent text, fill, or line colors in equivalent content.

## Out of Scope for Lint Rules

- Narrative quality
- Redesign suggestions
- Slide generation
- Chart restyling
- SmartArt transformation
