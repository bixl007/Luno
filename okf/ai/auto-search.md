---
type: Capability
title: Automatic search for fresh-data questions
description: A rule-based check that searches the web before the model answers whenever a prompt is clearly about today's or recent facts.
resource: ../../src/lib/ai/needsSearch.ts
tags: [search, heuristic, freshness]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:00:00Z }
---

`needsFreshData(prompt)` in `src/lib/ai/needsSearch.ts` decides, with regular expressions and no model call, whether a prompt needs live data. If so, [the reply loop](/ai/reply-loop.md) runs [web search](/ai/web-search.md) with the user's prompt as the query and hands the results to the model in the same request.

# What triggers it

| Pattern | Examples |
|---------|----------|
| Time words | today, tonight, right now, this week, this year |
| Recency words | latest, newest, most recent, breaking, trending |
| "current" plus a changing thing | current price, current president, current weather |
| Live topics | news, headlines, weather, forecast, stock price, exchange rate, who won, release date |
| A recent or future year | 2025 to 2039 |

# What never triggers it

Prompts containing a code fence, and prompts longer than 500 characters (mostly pasted text where "today" is incidental).

# Why a rule and not the model

The model can also call the `web_search` tool, but that costs an extra model call on every searched reply. A rule makes the common cases cheaper and more predictable, which matters on the free tier ([limits and quotas](/operations/limits-and-quotas.md)). The tool stays available for questions the rule misses, so the two complement each other.

# Tuning

Add or remove patterns in `FRESH_DATA_PATTERNS` and keep `tests/unit/ai/needsSearch.test.ts` in step. Prefer precision: a false positive spends one search from a quota shared by every user.
