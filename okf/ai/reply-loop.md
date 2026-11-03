---
type: Process
title: Reply loop (search, stream, tool calling)
description: How one reply is produced, from automatic search through streamed model rounds and optional model-requested searches.
resource: ../../src/lib/ai/reply.ts
tags: [gemini, tool-calling, search, streaming]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:00:00Z }
---

Implemented by `generateGeminiResponse(prompt, context, emit)` in `src/lib/ai/reply.ts`. It reports progress through `emit` as `status` and `delta` events ([streaming](/ai/streaming.md)) and returns the full reply text.

# Steps

1. **Build the input.** The new message, preceded by the last 12,000 characters of the stored [chat context](/data/chat-context.md) if any.
2. **Automatic search.** If the prompt is clearly about fresh facts ([auto search](/ai/auto-search.md)), search first and append the results to the input as a "Live web search results" block. This costs no extra model call.
3. **Call the model** with the `web_search` function tool declared, streaming text out as it arrives ([chat model](/ai/chat-model.md) for failover).
4. **No function call?** The text is the answer. If any search was used, the source list is appended (see below).
5. **Function call?** The model's turn is added to the conversation *unchanged* (Gemini 3 thought signatures ride on those parts and must be echoed), each call is answered with a `functionResponse`, then go back to step 3. The model is pinned for the remaining rounds.
6. **Final round.** After 2 tool rounds the tool is withheld, so the model must answer with what it has. At most 3 model calls happen per reply.

# Search rules

* At most **2 searches per round**. Extra calls in the same round still get a response, an error telling the model to use what it has, because the API needs one response per call. The reason is the shared daily search quota, see [limits and quotas](/operations/limits-and-quotas.md).
* A search that fails returns an error response telling the model to answer from its own knowledge and say it may be out of date. See [web search](/ai/web-search.md).
* Malformed calls (wrong tool name or empty query) get an "Invalid tool call" response.
* Every successful search is also kept as a note, so if a later round fails the reply can be rebuilt from the notes on any model that is up.

# Source list

When at least one search succeeded and the model produced text, the reply ends with `---`, `**Sources**` and up to 6 de-duplicated Markdown links, streamed as a final delta. An **empty** model reply gets no source list, so it falls through to the generic fallback instead of being saved as a bare list. The list is for display only: `withoutSources()` strips it before the reply is saved into [chat context](/data/chat-context.md). The [system prompt](/ai/system-prompt.md) tells the model not to write its own sources section.
