# Search-Grounded AI Rewrites

This backend revision makes `/api/flip` generate stronger AI lenses by adding a lightweight web-search context step before writing Calm, Bridge, Cynical, Opposite, and Playful.

## What this is

Search-grounded AI rewrites:

1. Analyze the original/imported post.
2. Use OpenAI Responses API web search to collect lightweight current context.
3. Extract topic tags, the original claim, tone, a context summary, and lens-specific angles.
4. Feed that context into the existing rewrite generation prompt.
5. Still write normal AI-generated FlipSide lens cards.

## What this is not

This does **not** import real posts.
This does **not** label anything as a source card.
This does **not** build People Mode recommendations.
This does **not** create fake real-world posts.

The UI should continue to show these as `AI-generated lens`.

## Environment flags

Search grounding is enabled by default.

Disable it with:

```bash
FLIPSIDE_SEARCH_GROUNDED_AI=false
```

Optional model override:

```bash
OPENAI_WEB_SEARCH_MODEL=gpt-4.1-mini
OPENAI_WEB_SEARCH_CONTEXT_SIZE=low
```

## Stored metadata

The post document gets:

```js
{
  lastAiGenerationMode: "search_grounded" | "classic",
  searchGrounding: {
    mode: "search_grounded",
    topicTags: [],
    originalClaim: string | null,
    originalTone: string | null,
    contextSummary: string | null,
    searchQueries: [],
    lensAngles: { calm, bridge, cynical, opposite, playful }
  }
}
```

Each AI rewrite also gets:

```js
{
  generationMode: "search_grounded" | "classic",
  searchGrounded: boolean
}
```

## Failure behavior

If web search fails, `/api/flip` falls back to the original classic rewrite mode so deck generation does not break.
