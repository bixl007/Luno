---
type: Configuration
title: Environment variables
description: Every environment variable Luno reads, with defaults and what depends on it.
resource: ../../.env.example
tags: [config, env, setup]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T21:00:00Z }
---

Copy `.env.example` to `.env` and fill it in. Never commit `.env`.

| Variable | Required | Default | Used for |
|----------|----------|---------|----------|
| `DATABASE_URL` | yes | none | PostgreSQL connection for Prisma ([data](/data/index.md)) |
| `BOT_API` | yes | none | Google AI Studio API key, for chat and search ([Gemini chat model](/ai/chat-model.md)) |
| `GEMINI_MODEL` | no | `gemini-3.8-flash` | Chat model |
| `GEMINI_FALLBACK_MODELS` | no | `gemini-3.6-flash,gemini-3.5-flash-lite` | Comma-separated free models tried, in order, when the chat model is overloaded, out of quota or retired ([failover](/ai/chat-model.md)). Empty disables failover |
| `GEMINI_HEDGE_MS` | no | `4000` | Milliseconds a model may stay silent before the next one starts alongside it ([failover](/ai/failover.md)). Higher saves requests, lower is faster |
| `GEMINI_THINKING_LEVEL` | no | `low` | Thinking effort: `low`, `medium` or `high`. Sent to `gemini-3*` models only |
| `GEMINI_TITLE_MODEL` | no | `gemini-3.1-flash-lite` | Small free model that writes [chat titles](/ai/chat-title.md) |
| `GEMINI_SEARCH_MODEL` | no | `gemini-2.5-flash-lite` | First model tried for [web search](/ai/web-search.md); it must support Google Search grounding. `gemini-2.5-flash-lite` and `gemini-2.5-flash` are always tried after it, so an outdated value is harmless |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | none | Clerk, browser side ([auth](/auth.md)) |
| `CLERK_SECRET_KEY` | yes | none | Clerk, server side |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | `/signin` | Sign-in page |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | yes | `/signup` | Sign-up page |
| `CLERK_WEBHOOK_SECRET` | for webhook | none | Verifies [Clerk webhook](/api/clerk-webhook.md) calls |
| `NEXT_DIST_DIR` | no | `.next` | Build output folder. `npm run build:check` sets it to `.next-check` so a check build never overwrites a running dev server's files |
| `NODE_ENV` | no | set by Next.js | Caches the Prisma client across reloads outside production |

`GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `GEMINI_TITLE_MODEL` and `GEMINI_SEARCH_MODEL` are read once at startup; restart the server after changing them.
