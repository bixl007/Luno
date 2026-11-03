---
type: Reference
title: Limits and quotas
description: Time limits, Gemini quotas and in-code caps that bound how Luno answers, with where each is set.
resource: ../../src/lib/ai/reply.ts
tags: [limits, quotas, gemini, performance]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T22:30:00Z }
stale_after: 2027-01-03T00:00:00Z
sources:
  - id: gemini-pricing
    resource: https://ai.google.dev/gemini-api/docs/pricing
    title: Gemini API pricing and free-tier terms
---

The Google figures were read from the official pricing page on 2026-11-03 and change often, hence `stale_after`. Check it before relying on them.[^gemini-pricing]

# Runtime

The repo requires Node 26 (`engines.node` is `>=26`, `.nvmrc`). Vercel's documentation, as read on 2026-11-03, lists Node 20, 22 and 24 and does not mention 26. If a Vercel build rejects the version, lower `engines.node` to a supported major.

# In-code caps

| Limit | Value | Where |
|-------|-------|-------|
| Route time limit | 60 s (`maxDuration`) | `src/app/api/chat/route.ts`, `src/app/api/message/route.ts` |
| Chat model idle timeout | 15 s without data (a streaming reply can run longer in total) | `GEMINI_TIMEOUT_MS`, `src/lib/ai/gemini.ts` |
| Chat model idle timeout with files | 35 s without data, and a 10 s hedge delay (reading images and PDFs takes longer, and each hedge uploads the files again) | `FILE_TIMEOUT_MS`, `FILE_HEDGE_MS`, `src/lib/ai/reply.ts` |
| Models tried per call | `GEMINI_MODEL` plus `GEMINI_FALLBACK_MODELS`, hedged after 2.5 s of silence | [failover](/ai/failover.md) |
| Automatic search length cutoff | prompts over 500 characters are not auto-searched | `src/lib/ai/needsSearch.ts`, see [auto search](/ai/auto-search.md) |
| Search call timeout | 8 s for DuckDuckGo, 20 s for the Gemini fallback | `DDG_TIMEOUT_MS`, `SEARCH_TIMEOUT_MS`, `src/lib/ai/webSearch.ts` |
| Tool rounds per reply | 2 (so at most 3 model calls) | `MAX_TOOL_ROUNDS`, `src/lib/ai/reply.ts` |
| Searches per round | 2 | `MAX_SEARCHES_PER_ROUND`, `src/lib/ai/reply.ts` |
| Sources shown | 6 | `MAX_SOURCES`, `src/lib/ai/reply.ts` |
| Files per message | 4 files, 3 MB in total before base64; images over 400 KB are shrunk to 1600 px in the browser | `src/lib/attachments.ts`, `src/components/chat/files.ts` |
| Text file length | 60,000 characters per file, the rest is cut | `src/lib/ai/prompt.ts` |
| History sent to the model | last 12,000 characters | `MAX_CONTEXT_CHARS`, `src/lib/ai/prompt.ts`, see [chat context](/data/chat-context.md) |

The worst case (3 model calls plus 2 searches, each running to its timeout, with failover on top) can still exceed 60 s; typical replies are far shorter. Streaming makes long replies feel faster but does not extend the limit. See [reply loop](/ai/reply-loop.md).

# Google-side quotas

* **The free tier allows about 20 requests per day per model.** Google's own `429` said so for `gemini-2.5-flash-lite` on 2026-11-03: `generate_content_free_tier_requests, limit: 20 ... requests per day limit exceeded on Free Tier. Please retry in 17h53m`. This is the real ceiling of the app, far below the pricing page's "500 grounded requests per day" (that is a separate tool limit, not the request limit). With three chat models and one search model, expect roughly 60 chat replies a day. A reply costs one request, plus one for each automatic or requested search, one per new chat for the title, and one per hedge.
* Free-tier prompts may be used to improve Google's products.
* Google Search grounding is free only on the 2.5 models. Gemini 3 and newer answer grounded requests with `429` on a free key. `gemini-2.5-flash` is no longer served to new keys (`404`), so search uses `gemini-2.5-flash-lite`, and that model is kept out of the chat chain so chat does not drain search's 20 requests.
* Failover and hedging spread load across models but spend extra requests ([failover](/ai/failover.md)). A model that reports a daily quota is skipped for an hour.
* Every new chat makes one small request to the title model (`gemini-3.1-flash-lite`, free tier), see [chat titles](/ai/chat-title.md).
* All users share one API key, so one user's searches draw from everyone's quota, which is why searches are capped. Automatic search ([auto search](/ai/auto-search.md)) also spends one search per matching prompt. See [web search](/ai/web-search.md) and the [decision](/decisions/gemini-model-and-search.md).
* **Testing against the real API spends this allowance.** `npm run test:live`, probes and timing scripts all count.
* **To remove the ceiling, enable billing** on the Google AI project. Paid tiers have far higher limits and unlock grounding on Gemini 3 models.

[^gemini-pricing]: Gemini API pricing page, per-model free tier tables.
