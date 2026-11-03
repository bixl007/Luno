# Luno: read this first

Luno is a signed-in AI chat app on Node 26: Next.js 15 (App Router) + React 19 + TypeScript, Clerk auth, Prisma + PostgreSQL, Google Gemini with live web search. Every agent working in this repo starts here.

## Read in this order

1. **This file** for orientation and the checklist.
2. **[GUIDELINES.md](GUIDELINES.md)** for the rules. Rules marked MUST are not negotiable.
3. **[okf/index.md](okf/index.md)** for how the system works. It is an Open Knowledge Format knowledge bundle. Open only the concept files for the area you are touching.

If the code and the docs disagree, the code wins. Fix the docs in the same change.

## Where to look for what

| If the task involves | Read first |
|---|---|
| How a message becomes a reply | [okf/request-flow.md](okf/request-flow.md) |
| The model, prompt, streaming, failover, tool loop or search | [okf/ai/index.md](okf/ai/index.md) |
| Why `gemini-3.8-flash` for chat but `gemini-2.5-flash-lite` for search | [okf/decisions/gemini-model-and-search.md](okf/decisions/gemini-model-and-search.md) |
| An endpoint under `src/app/api/` | [okf/api/index.md](okf/api/index.md) |
| Database models, `Chat.context`, migrations | [okf/data/index.md](okf/data/index.md) |
| Login, route protection, the Clerk webhook | [okf/auth.md](okf/auth.md) |
| The dashboard or landing page | [okf/ui/index.md](okf/ui/index.md) |
| Env vars, setup, git hooks, time limits, API quotas | [okf/operations/index.md](okf/operations/index.md) |
| Where a new file should go | [okf/operations/repository-structure.md](okf/operations/repository-structure.md) |
| Writing or running tests | [okf/operations/testing.md](okf/operations/testing.md) |

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build:check` | Production build into `.next-check`. Never run plain `npm run build` while the dev server is running |
| `npm run check` | Lint, typecheck, tests and `okf:check` (what the pre-commit hook runs) |
| `npm test` | Unit, api and integration tests (offline, no key needed) |
| `npm run lint`, `npm run typecheck` | ESLint and `tsc --noEmit` |
| `npm run okf:check` | Validate the `okf/` bundle |
| `npm run test:live` | Real Gemini API tests; only when asked, they spend quota |

## Key files

* `src/lib/ai/reply.ts`: the streamed tool-calling loop and error fallbacks (`generateGeminiResponse`).
* `src/lib/ai/gemini.ts`: Gemini transport, model chain and failover.
* `src/lib/ai/prompt.ts`: the system prompt and how history and search results are added.
* `src/lib/ai/title.ts`: generated chat titles.
* `src/lib/ai/webSearch.ts`, `src/lib/ai/needsSearch.ts`: web search and the rule that triggers it automatically.
* `src/lib/http/ndjson.ts`: the streaming wire format, server and client sides.
* `src/components/chat/Chat.tsx`: the dashboard UI.
* `src/app/api/chat/route.ts`, `src/app/api/message/route.ts`, `src/app/api/webhooks/clerk/route.ts`: the endpoints.
* `prisma/schema.prisma`: the data model.
* `src/middleware.ts`: Clerk route protection.

## Before you finish, every time

1. Run `npm run check` (and `npm run build:check` if you touched build-relevant code) and read the results. Do not bypass the Husky git hooks.
2. Update the matching file in `okf/`, its `generated.at`, and `okf/log.md` ([GUIDELINES.md §6](GUIDELINES.md)).
3. Update `readme.md` and `.env.example` if setup or env vars changed.
4. Report what you changed and what you could not verify. There is no Gemini key in most environments, so live API behavior is usually untested: say so.

## Never

* Read, print or commit `.env` or any real key.
* Commit, push or open a pull request unless asked.
* Trust an id from the client without checking it belongs to the signed-in user.
* Let `generateGeminiResponse` throw, or change search limits without reading [okf/operations/limits-and-quotas.md](okf/operations/limits-and-quotas.md).
