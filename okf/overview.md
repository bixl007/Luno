---
type: Application
title: Luno
description: "Full-stack AI chat app: Next.js, Clerk auth, Prisma/PostgreSQL and Google Gemini with live web search."
resource: https://github.com/bixl007/Luno
tags: [overview, nextjs, gemini, chatbot]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T16:00:00Z }
---

# What it is

Luno is a signed-in chat assistant. Users create chats, send messages and get Markdown replies from Gemini. Replies to time-sensitive questions use live web search and end with a source list. Chat history is stored per user.

# Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | Clerk, see [Authentication](/auth.md) |
| Database | PostgreSQL through Prisma 6, see [Data](/data/index.md) |
| AI | Gemini over REST with axios (no SDK), see [AI](/ai/index.md) |

# Repository map

| Path | Holds |
|------|-------|
| `src/app/` | Routes only: pages and the three endpoints, see [API](/api/index.md) |
| `src/components/chat/`, `src/components/landing/`, `src/components/ui/` | Dashboard chat UI, landing page and reusable pieces, see [UI](/ui/index.md) |
| `src/lib/ai/` | Everything about Gemini: transport and failover (`gemini.ts`), prompt (`prompt.ts`), reply loop (`reply.ts`), [titles](/ai/chat-title.md) (`title.ts`), [web search](/ai/web-search.md), [auto search](/ai/auto-search.md) |
| `src/lib/http/ndjson.ts` | The [streaming](/ai/streaming.md) wire format, server and client |
| `src/lib/db/prisma.ts` | Prisma client singleton (generated client lives in `src/generated/prisma`, git-ignored) |
| `src/middleware.ts` | Clerk route protection |
| `tests/` | Unit, api, integration and live tests, see [testing](/operations/testing.md) |
| `prisma/` | Schema and migrations |
| `okf/` | This knowledge bundle |

Where new files belong: [repository structure](/operations/repository-structure.md).

# Where to go next

* A message's journey: [Request flow](/request-flow.md).
* Setup, commands and git hooks: [Development](/operations/development.md) and [Environment](/operations/environment.md).
* Quotas and time limits that shape the design: [Limits and quotas](/operations/limits-and-quotas.md).
