---
type: Capability
title: Web search
description: Live search through Gemini 2.5 Flash with Google Search grounding, returning a summary and de-duplicated sources, or null on failure.
resource: ../../src/lib/ai/webSearch.ts
tags: [search, grounding, gemini]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T20:00:00Z }
sources:
  - id: gemini-pricing
    resource: https://ai.google.dev/gemini-api/docs/pricing
    title: Gemini API pricing (grounding availability per tier)
---

# How it works

`webSearch(query)` in `src/lib/ai/webSearch.ts` makes one `generateContent` call with the `google_search` tool, to the first model that answers in this chain: `GEMINI_SEARCH_MODEL` (default `gemini-2.5-flash-lite`), then `gemini-2.5-flash-lite`, then `gemini-2.5-flash`. A model that answers `404`, `429` or a server error is skipped, so a stale `GEMINI_SEARCH_MODEL` in `.env` cannot break search. The call carries a short instruction to report what recent, reliable sources say. It returns:

* `summary`: the model's text. It reaches the chat model either as a tool result or, for prompts caught by [auto search](/ai/auto-search.md), as a block appended to the user message ([reply loop](/ai/reply-loop.md)).
* `sources`: `{ title, url }` pairs from `groundingMetadata.groundingChunks`, de-duplicated by URL. URLs are Google redirect links and titles are usually domain names.

If every model fails (HTTP error, timeout of 20 seconds, empty text) it logs the error and returns `null`; the chat model is then told search is unavailable.

# Why a separate model

Google Search grounding is free only on the 2.5 models; on Gemini 3 and newer it is paid-only.[^gemini-pricing] Checked against a real free-tier key on 2026-11-03: Gemini 3.x models answered `429 RESOURCE_EXHAUSTED` for grounded requests, `gemini-2.5-flash` answered `404` ("no longer available to new users"), and `gemini-2.5-flash-lite` returned grounded results with sources. So search runs on `gemini-2.5-flash-lite`. See the [decision](/decisions/gemini-model-and-search.md) and [limits and quotas](/operations/limits-and-quotas.md).

# Things that did not work

DuckDuckGo's HTML endpoint answers scripted requests with a bot challenge (HTTP 202 with no results), so scraping it is not dependable. The earlier scraper-based search was removed on 2026-04-08, see the [log](/log.md).

[^gemini-pricing]: Gemini API pricing page: grounding is "Not available" on the free tier of Gemini 3.x models; free 2.5 Flash allows 500 grounded requests per day.
