# Rewrite Engine v2 Evaluation

Use the eight fixtures in `src/lib/flipRewriteFixtures.ts` for a blind old-versus-new review.

## Before applying the patch

1. Run each fixture through the current production engine.
2. Save the five outputs, total latency, and any visible formatting loss.
3. Label those results `A`; do not tell reviewers which engine produced them.

## After applying the patch

1. Run the same fixtures through both `/api/flip` and `/api/share-extension/flip`.
2. Save the five outputs, total latency, API usage, and visible formatting.
3. Label those results `B`.

## Blind scoring

For every deck, score 1–5 on:

- rhetorical and structural fidelity
- native social-media voice
- lens authenticity
- issue specificity
- memorability
- separation across all five lenses

Also record:

- which deck contains the single strongest card
- whether any card sounds like PR, HR, a civics teacher, a policy memo, or motivational copy
- whether lists, capitalization, quotation, and line breaks survive through Firestore, web, mobile, and exported share cards
- whether the full deck feels worth sharing

## Launch threshold

Treat v2 as a quality improvement only when blind reviewers prefer it clearly and consistently. Record cost per Flip from the returned `usage` object rather than estimating from request count alone.
