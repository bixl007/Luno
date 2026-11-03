---
type: AI Model
title: Gemini chat model
description: "gemini-3.8-flash streams replies over streamGenerateContent, fails over to other free models when overloaded, and degrades to friendly messages."
resource: ../../src/lib/ai/gemini.ts
tags: [gemini, model, config, failover]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:10:00Z }
sources:
  - id: gemini-pricing
    resource: https://ai.google.dev/gemini-api/docs/pricing
    title: Gemini API pricing (free tier per model)
---

# Settings

| Setting | Default | Env var |
|---------|---------|---------|
| Model | `gemini-3.8-flash`, the newest free-tier text model[^gemini-pricing] | `GEMINI_MODEL` |
| Fallback models, in order | `gemini-3.6-flash`, `gemini-3.5-flash-lite` (free-tier[^gemini-pricing]; both answered a live probe on 2026-11-03). `gemini-2.5-flash-lite` is deliberately left out: web search needs all of its daily quota | `GEMINI_FALLBACK_MODELS` (comma separated; empty disables) |
| Thinking effort | `low` (`minimal` is rejected by this model); sent to `gemini-3*` models only, since older models reject `thinkingLevel` | `GEMINI_THINKING_LEVEL` |
| Idle timeout | 15 seconds without data per attempt | not configurable |
| Hedge delay | 2.5 seconds of silence before the next model starts alongside, see [failover](/ai/failover.md) | `GEMINI_HEDGE_MS` |

Requests go to `streamGenerateContent` (server-sent events) through `geminiEndpoint(model, true)` in `src/lib/ai/gemini.ts`, authenticated with `BOT_API` as a query parameter. The system prompt is sent in the `systemInstruction` field, see [system prompt](/ai/system-prompt.md). Why this model: [decision](/decisions/gemini-model-and-search.md). How text reaches the browser: [streaming](/ai/streaming.md).

# Failover

A busy model answers `503 UNAVAILABLE`, an exhausted one `429`, a retired one `404` (what `gemini-2.5-flash` does for new keys). The call then moves to the next model, a silent model is hedged after 2.5 seconds, and models that misbehave are skipped for a while. Details and numbers: [failover](/ai/failover.md).

After a tool round the model is *pinned*: the echoed turn carries thought signatures that only that model accepts. If the pinned model then fails, the loop restarts from a plain prompt that contains the gathered search results (no tool turns) and tries the whole chain. See [reply loop](/ai/reply-loop.md).

# Error handling

`generateGeminiResponse` never throws to its callers. When every model fails it returns a fallback message:

| Gemini status | Fallback |
|---------------|----------|
| `429` | Rate limit reached, try again in a minute |
| `503` | Models overloaded, try again shortly |
| `400` | One retry with a minimal request (no history, no tools, no thinking config), then the generic message |
| anything else, or an empty reply | Generic "technical problem" message pointing to the creator's website |
| stream broke after text had been sent | The text received so far plus a short "interrupted" note |

If the user's prompt asks about the creator or developer, a short creator blurb is appended to the fallback. Error bodies of streamed requests arrive as streams, so they are read before being logged.

# Tests

`tests/unit/ai/reply.test.ts` stubs the API and covers streaming, failover and the loop. See [testing](/operations/testing.md).

[^gemini-pricing]: Gemini API pricing page; `gemini-4-argon` is newer but not on the free tier.
