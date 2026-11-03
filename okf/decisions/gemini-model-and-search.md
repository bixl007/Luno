---
type: Decision
title: Gemini model and search choice
description: Why chat uses gemini-3.8-flash while web search runs on gemini-2.5-flash-lite with Google Search grounding.
resource: ../../src/lib/ai/webSearch.ts
tags: [decision, gemini, search, cost]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T21:00:00Z }
stale_after: 2027-01-03T00:00:00Z
sources:
  - id: gemini-pricing
    resource: https://ai.google.dev/gemini-api/docs/pricing
    title: Gemini API pricing and free-tier terms
---

# Decision

* **Chat** uses `gemini-3.8-flash`, the newest model with a free tier.[^gemini-pricing]
* **Search** is a tool the chat model calls. It runs on `gemini-2.5-flash-lite` with Google Search grounding, not on the chat model. See [web search](/ai/web-search.md) and [reply loop](/ai/reply-loop.md).

* **Failover:** when the chat model is overloaded (`503 UNAVAILABLE`), the call moves to `gemini-3.6-flash`, then `gemini-3.5-flash-lite`, instead of failing, and slow models are hedged and demoted ([failover](/ai/failover.md)) ([chat model](/ai/chat-model.md)).
* **Fresh-data questions** are searched automatically before the model answers ([auto search](/ai/auto-search.md)); the model can still search on its own.

# Why

* Grounding is not available on the free tier of Gemini 3 models, but it is free on 2.5 Flash (500 requests a day).[^gemini-pricing] Using the 2.5 model for the search step keeps the project on a free key.
* The same `BOT_API` key serves all of them, so there is no second provider or account.
* New free models are often overloaded at launch. Spreading load over older free models keeps replies flowing on the free tier.
* Searching by rule before the model call saves a model call on the most common search questions.
* `gemini-2.5-flash` was the first choice for search but Google stopped serving it to new API keys (`404`), found when a real key failed on 2026-11-03. A live probe showed Gemini 3 grounding has no free quota (`429`) and `gemini-2.5-flash-lite` works. Search and chat both fail over on `404`, so a retired model degrades instead of breaking.
* Scraping a search engine was tried first and removed ([log](/log.md)); a no-key scrape (DuckDuckGo HTML) is blocked from scripts.

# Costs of the choice

* The free tier is about 20 requests a day per model, so the whole app is capped near 60 chat replies a day. `gemini-2.5-flash-lite` is kept out of the chat chain to protect search. Enable billing to lift this ([limits and quotas](/operations/limits-and-quotas.md)).

* A reply that searches makes two calls to the chat model plus one search call, which uses free-tier request limits quickly. See [limits and quotas](/operations/limits-and-quotas.md).
* Search summaries are written by a second model, so they can differ in quality from the chat model.

# Revisit when

The free tier changes, `gemini-2.5-flash-lite` is retired too, a newer free model supports grounding, or the project moves to a paid plan. Then `GEMINI_SEARCH_MODEL` can point at the chat model and the split can go away ([environment](/operations/environment.md)).

[^gemini-pricing]: Gemini API pricing page, read on 2026-11-03.
