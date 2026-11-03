---
type: Configuration
title: Environment variables
description: Every environment variable Luno reads, with defaults and what depends on it.
resource: ../../.env.example
tags: [config, env, setup]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T21:30:00Z }
---

Copy `.env.example` to `.env` and fill it in. Never commit `.env`.

| Variable | Required | Default | Used for |
|----------|----------|---------|----------|
| `DATABASE_URL` | yes | none | PostgreSQL connection for Prisma ([data](/data/index.md)) |
| `BOT_API` | yes | none | Google AI Studio API key, for chat and search ([Gemini chat model](/ai/chat-model.md)) |
| `GEMINI_MODEL` | no | `gemini-3.8-flash` | Chat model |
| `GEMINI_FALLBACK_MODELS` | no | `gemini-3.6-flash,gemini-3.5-flash-lite` | Comma-separated free models tried, in order, when the chat model is overloaded, out of quota or retired ([failover](/ai/chat-model.md)). Empty disables failover |
| `GEMINI_HEDGE_MS` | no | `2500` | Milliseconds a model may stay silent before the next one starts alongside it ([failover](/ai/failover.md)). Higher saves requests, lower is faster |
| `GROQ_API_KEY`, `OPENROUTER_API_KEY` | no | none | Free keys for the extra vision providers ([models and files](/ai/models-and-files.md)). A provider's models appear in the picker only when its key is set |
| `GROQ_MODELS`, `OPENROUTER_MODELS` | no | `qwen/qwen3.8-27b`, `openrouter/free` | Comma-separated model ids offered for that provider. Every id must accept image input. `GROQ_MODEL` (a single id) still works for Groq |
| `AUTO_PREFER_GEMINI` | no | unset | Set to `1` so Auto tries Gemini first instead of a configured Groq or OpenRouter model ([models and files](/ai/models-and-files.md)) |
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

`GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `GEMINI_TITLE_MODEL`, `GEMINI_SEARCH_MODEL` and the provider key and model variables are read once at startup; restart the server after changing them.
