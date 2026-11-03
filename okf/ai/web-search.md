---
type: Capability
title: Web search
description: Live search that asks DuckDuckGo, Bing, Google News and Wikipedia at once (no search key needed) and merges the results, with Gemini's Google Search grounding as the last fallback, returning a summary and de-duplicated sources, or null on failure.
resource: ../../src/lib/ai/webSearch.ts
tags: [search, duckduckgo, bing, google-news, wikipedia, grounding, gemini]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T02:00:00Z }
sources:
  - id: gemini-pricing
    resource: https://ai.google.dev/gemini-api/docs/pricing
    title: Gemini API pricing (grounding availability per tier)
---

# How it works

`webSearch(query)` in `src/lib/ai/webSearch.ts` asks four free sources **at the same time** (6 second timeout each, none needs a key), merges what they return, and only if all four come back empty falls back to Gemini's grounded search. Asking several at once is what keeps search working when a host blocks one of them: the production logs showed DuckDuckGo answering HTTP 4xx to every request from Vercel, while the others still answered.

| Source | Request | Gives |
|--------|---------|-------|
| DuckDuckGo (`ddgHits`) | `GET html.duckduckgo.com/html/?q=` parsed with `cheerio` (ads skipped, redirect links resolved) | `[web]` pages with snippets. Blocked from hosting addresses |
| Bing (`bingHits`) | `GET bing.com/search?format=rss&q=` | `[web]` pages with snippets and a publish date |
| Google News (`newsHits`) | `GET news.google.com/rss/search?q=` | `[news]` dated headlines (the title ends with the publisher) |
| Wikipedia (`wikiHits`) | `GET en.wikipedia.org/w/api.php` with `generator=search` and the intro extract, identifying itself as Luno as Wikimedia asks | `[wiki]` background on the topic |

Each source's hits are filtered by `matchesQuery` (kept only if the title or snippet shares a word with the query, ignoring filler such as "now" and "today", because Bing sometimes returns unrelated pages), cut to the best three, and interleaved round-robin (so no one source fills the list) into at most eight results, de-duplicated by URL. The summary the model reads tags every line `[web]`, `[news]` or `[wiki]` and says what the tags mean: news items are dated headlines, wiki items are encyclopedia background that can be out of date for current events. The user sees the same results as the source list.

# Reading the top pages

Snippets rarely hold specifics: asked for "the list of upcoming Indian cricket team matches", the model had only links to schedule pages and answered that it could not give dates. So after merging, `webSearch` opens the best two `[web]` results, one per site (`readPage`, 5 second timeout, at most 1.5 MB, HTML only, three redirects) and `excerptOf` keeps the lines most likely to answer the query: headings, paragraphs, list items and table rows (cells joined with ` | `), after dropping menus, scripts and footers. Lines are scored by words shared with the query, plus a point for a date or time and one for a table row, and the best are kept in page order up to 2,200 characters per page. The text is added to the summary under a line that marks it as untrusted data to use for dates and numbers. Results that are news redirects, Wikipedia, social or video sites, documents, or private network addresses (`canRead`) are never opened, so the search cannot be turned on the server's own network. A page that cannot be read (blocked, not HTML) is skipped and the results stay as they were.

After this the same question produced a series-by-series list taken from the page text. Reading pages adds one to two fetches per search and roughly 600 tokens per page to every later turn, which matters on the fast providers' free input-token limits.

Measured on 2026-11-03 from the development machine: four real queries returned 7 to 8 mixed results in 0.7 to 1.1 seconds.

For the time and weather in a place, search is not used: the model has a separate [place_conditions tool](/ai/place-conditions.md).

# Why Gemini grounding is only the fallback

Checked against a real free-tier key on 2026-11-03: `gemini-2.5-flash` and `gemini-2.5-flash-lite` both answer `404` ("no longer available to new users") and every Gemini 3.x model answers `429` ("exceeded your current quota") for requests with the `google_search` tool.[^gemini-pricing] The chat on `gemini-2.5-flash-lite` that used to work is gone for new keys, so a free key has no working Google grounding. A paid key still can use it, hence the fallback. See the [decision](/decisions/gemini-model-and-search.md) and [limits and quotas](/operations/limits-and-quotas.md).

# Risks

* Quality, not availability, is the main risk: these are unranked snippets, so results can conflict (a query about a current role returned both an old and a new office-holder). The system prompt tells the model never to state a current fact that the results or a tool do not say, and to say so when it cannot find it.
* Neither free page is an API, so each can change its markup, rate-limit, or block requests from shared hosting addresses, and no key can fix that. Everything here was tested from a home connection. Vercel's logs confirmed that DuckDuckGo is blocked there (`DuckDuckGo search failed: ERR_BAD_REQUEST`); Bing answered but with weak results; Google News and Wikipedia have not been seen from Vercel yet. A failing source logs `<name> search failed: <HTTP status>`. The only fully dependable options are a paid or keyed search API, or a paid Gemini key for grounding.
* DuckDuckGo's HTML page is not an API. It can change its markup, rate-limit or show a bot challenge, which is more likely from shared datacentre addresses (such as a hosting platform) than from a home connection. An earlier check in this project saw a bot challenge (HTTP 202, no results) for scripted requests, while on 2026-11-03 a request from the development machine returned ten results. If search fails after deploying, a keyed provider such as Tavily (1,000 free credits a month according to its documentation, not tried here) is the dependable replacement, and the place to add it is `webSearch`.
* Snippets carry no dates, so questions that need the exact latest number depend on what the model reads in the titles and snippets, and may be wrong or conflicting (the live test above showed the model flagging two different Node.js versions).

[^gemini-pricing]: Gemini API pricing page: grounding is "Not available" on the free tier of Gemini 3.x models. The 404 and 429 answers above were observed live.
