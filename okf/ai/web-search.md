---
type: Capability
title: Web search
description: Live search through DuckDuckGo's results page, then Bing's RSS feed, then Gemini's Google Search grounding (no search key needed), returning a summary and de-duplicated sources, or null on failure.
resource: ../../src/lib/ai/webSearch.ts
tags: [search, duckduckgo, bing, grounding, gemini]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T00:10:00Z }
sources:
  - id: gemini-pricing
    resource: https://ai.google.dev/gemini-api/docs/pricing
    title: Gemini API pricing (grounding availability per tier)
---

# How it works

`webSearch(query)` in `src/lib/ai/webSearch.ts` tries three sources in order and returns the first that gives results. None of the first two needs a key or an account:

1. **DuckDuckGo** (`searchDuckDuckGo`): one `GET` of `html.duckduckgo.com/html/?q=...` (8 second timeout, no key), parsed with `cheerio` by `parseDuckDuckGo`. It takes up to six organic results (ads are skipped, duplicates dropped), turns DuckDuckGo's redirect links back into the real addresses, and builds a summary of `- title (host): snippet` lines. The chat model reads those as untrusted data and writes the answer. A page with no results (for example a bot check) counts as a failure.
2. **Bing's RSS feed** (`searchBing`): one `GET` of `bing.com/search?format=rss&q=...` (8 second timeout), parsed by `parseBingRss`. Items carry a title, link, snippet and publish date, so result lines read `- title (host, 02 Nov 2026): snippet`. Bing sometimes ignores the query and returns unrelated popular pages (seen for queries containing "now": it returned speed-test pages for a weather question), so both DuckDuckGo and Bing results are filtered by `matchesQuery`: a result is kept only if its title or snippet shares a word with the query (ignoring filler such as "now", "today", "current"). A batch with nothing left counts as a failure and the next source is tried.
3. **Gemini Google Search grounding** (`searchWithGemini`): one `generateContent` call with the `google_search` tool to the first model that answers in `GEMINI_SEARCH_MODEL`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`. This is the fallback because free keys no longer get it, see below.

It returns `summary` (reaches the chat model as a tool result or, for prompts caught by [auto search](/ai/auto-search.md), as a block appended to the user message, see [reply loop](/ai/reply-loop.md)) and `sources` (`{ title, url }` pairs, de-duplicated by URL). If both sources fail it logs the reason and returns `null`; the chat model is then told search is unavailable.

Measured on 2026-11-03 from the development machine: a DuckDuckGo search took about 0.8 seconds and returned six sources, and an answer that used it took 1.7 seconds in total.

# Why Gemini grounding is only the fallback

Checked against a real free-tier key on 2026-11-03: `gemini-2.5-flash` and `gemini-2.5-flash-lite` both answer `404` ("no longer available to new users") and every Gemini 3.x model answers `429` ("exceeded your current quota") for requests with the `google_search` tool.[^gemini-pricing] The chat on `gemini-2.5-flash-lite` that used to work is gone for new keys, so a free key has no working Google grounding. A paid key still can use it, hence the fallback. See the [decision](/decisions/gemini-model-and-search.md) and [limits and quotas](/operations/limits-and-quotas.md).

# Risks

* Neither free page is an API, so each can change its markup, rate-limit, or block requests from shared hosting addresses, and no key can fix that. Everything here was tested from a home connection; whether the deployed site (Vercel) is blocked was not confirmed from Vercel's logs. If both fail there, the log shows `DuckDuckGo search failed` and `Bing search failed` lines. The only fully dependable options are a paid or keyed search API, or a paid Gemini key for grounding.
* DuckDuckGo's HTML page is not an API. It can change its markup, rate-limit or show a bot challenge, which is more likely from shared datacentre addresses (such as a hosting platform) than from a home connection. An earlier check in this project saw a bot challenge (HTTP 202, no results) for scripted requests, while on 2026-11-03 a request from the development machine returned ten results. If search fails after deploying, a keyed provider such as Tavily (1,000 free credits a month according to its documentation, not tried here) is the dependable replacement, and the place to add it is `webSearch`.
* Snippets carry no dates, so questions that need the exact latest number depend on what the model reads in the titles and snippets, and may be wrong or conflicting (the live test above showed the model flagging two different Node.js versions).

[^gemini-pricing]: Gemini API pricing page: grounding is "Not available" on the free tier of Gemini 3.x models. The 404 and 429 answers above were observed live.
