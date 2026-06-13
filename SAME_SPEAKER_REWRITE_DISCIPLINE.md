# Same-Speaker Rewrite Discipline

This backend patch tightens FlipSide AI rewrite generation after the search-grounded context step.

## Goal

The lenses should read like the same original speaker writing the same post through five different interpretive frames.

The target is:

- same speaker voice
- same post shape
- same tense and point of view where possible
- same directness and rough length
- different lens logic

## What changed

`src/app/api/flip/route.ts` now:

1. Builds a lightweight `postShape` profile from the original post.
2. Adds post-shape preservation rules to the initial lens generation prompt.
3. Keeps search grounding as background context only.
4. Lowers first-pass temperature to reduce drift.
5. Adds a final rewrite-discipline pass before saving each AI lens.

## What this should reduce

- outputs that read like replies to the original post
- meta-commentary about public reaction
- unnecessary tense shifts
- list formatting when the original was not a list
- Bridge becoming an explainer
- Calm becoming vague or over-softened
- Opposite becoming a detached response instead of a same-shape counter-post

## What this does not change

- Mobile app flow
- Firestore structure
- People Mode/imported post behavior
- AI-generated lenses remain AI-generated lenses
- Existing decks do not regenerate automatically
