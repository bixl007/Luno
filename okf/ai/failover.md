---
type: Process
title: Model failover, hedging and health memory
description: How a reply gets a model that works and is fast, when the newest free Gemini model is overloaded, hung, retired or out of quota.
resource: ../../src/lib/ai/gemini.ts
tags: [gemini, failover, latency, quota]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:10:00Z }
---

The newest free model, `gemini-3.8-flash`, was measured on 2026-11-03 answering `503 UNAVAILABLE` or hanging until the timeout on every request, and `gemini-3.6-flash` took 2 to 16 seconds to start. Simple sequential failover made every reply wait 15 seconds for the broken model first (17 s for a plain reply, 36 s with search). Three mechanisms fix that. All live in `src/lib/ai/gemini.ts` and `src/lib/ai/modelHealth.ts`.

# 1. Failover

A call moves to the next model on `404` (retired, or not offered to this key), `429` (quota), `5xx`, and timeouts or dropped connections. Anything else (`400`, `401`, `403`) is final, because another model would fail the same way. The chain is `GEMINI_MODEL` then `GEMINI_FALLBACK_MODELS` ([chat model](/ai/chat-model.md)).

# 2. Hedging

`streamWithFailover` does not wait for a silent model to fail. If a model has produced no output after `GEMINI_HEDGE_MS` (2.5 seconds), the next model starts **alongside** it. The first one to send output wins and every other request is cancelled. A model that answers in time is never hedged, so a healthy primary costs one request.

Once the winner has started answering, an error is final. Text may already be on screen, so nothing else is tried and the partial text is kept with an "interrupted" note ([reply loop](/ai/reply-loop.md)).

# 3. Health memory

Models that misbehave are moved to the back of the line for a while, in memory per server process (`modelHealth.ts`):

| Why | Skipped for |
|-----|-------------|
| `404` retired or not offered | 1 hour |
| `429` that names a **daily** quota | 1 hour |
| `429` per-minute limit | 1 minute |
| `5xx`, timeout, or broke while answering | 5 minutes |
| Silent past the hedge delay (lost the race, or won slowly) | 5 minutes |

Skipped models are not dropped: they sort after healthy ones, soonest to recover first, and are all still tried if everything is cooling down. So after one slow reply the fast models go first, and the newest model is retried when its cooldown ends.

# What it costs: quota

Each hedge is an extra request. The **free tier allows only about 20 requests per day per model** ([limits and quotas](/operations/limits-and-quotas.md)), so hedging spends the daily allowance faster in exchange for speed, and only when a model is slow. To save requests, set `GEMINI_HEDGE_MS` higher, or choose a faster, more reliable `GEMINI_MODEL` (for example `gemini-3.5-flash-lite`, measured under one second). Enabling billing on the Google project removes the ceiling.

# Tests

`tests/unit/ai/reply.test.ts`, `gemini.test.ts` and `modelHealth.test.ts` cover hedging (with a request that hangs until cancelled), cancellation of the loser, "only the first to answer is heard", demotion of failed, slow and daily-quota models, and recovery. `tests/setup.ts` sets `GEMINI_HEDGE_MS` to 40 ms so these run fast. See [testing](/operations/testing.md).
