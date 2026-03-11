# Editorial Spot-Check Checklist

Use this checklist during Sprint 2.5 manual review.

## Core Checks

- Natural language quality:
  does the card read like normal human-written quiz copy rather than generated scaffolding?
- Readability aloud:
  can a host read the prompt and options out loud without mentally rewriting them?
- Host usability:
  does the card work in a live room without causing confusion or awkward explanation?
- Answer-option clarity:
  are options distinct, plausible, and easy to parse quickly?
- Ambiguity:
  is there any wording that makes the expected correct set unclear?
- Trustworthiness of wording:
  does the card sound factually serious rather than flimsy, jokey by accident, or synthetic?

## EN Notes

- Reject wording that sounds like worksheet filler or templated generator output.
- Reject distractors that are grammatically valid but obviously low-information.
- Prefer crisp spoken phrasing over overly literal explanatory sentences.

## ET Notes

- Reject anything that sounds translated instead of idiomatic Estonian.
- Reject wording that a native speaker would silently fix before reading aloud.
- Reject English leakage unless the term is intentionally language-neutral and expected in context.
- Prefer natural Estonian sentence rhythm over mechanically compressed phrasing.

## Outcome Labels

- `PASS`: no meaningful editorial issue found.
- `PASS_WITH_NOTE`: usable for pilot, but note a minor wording observation.
- `NEEDS_REPAIR`: wording, clarity, or trust issue is strong enough to block the sampled card.
