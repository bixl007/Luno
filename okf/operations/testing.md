---
type: Reference
title: Testing
description: The four test layers, what each one proves, how to run them, the shared helpers, and the opt-in live tests.
resource: ../../tests
tags: [testing, quality, ci]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T21:00:00Z }
---

Tests use Node's built-in runner (`node:test`) through `tsx`, so TypeScript and the `@/` alias work without a build step. There is no Jest or Vitest.

# Layers

| Folder | Proves | Uses |
|--------|--------|------|
| `tests/unit/ai/` | One module at a time: [reply loop](/ai/reply-loop.md), failover, prompt building, [titles](/ai/chat-title.md), [auto search](/ai/auto-search.md), [web search](/ai/web-search.md), the Gemini transport | stubbed `axios.post` |
| `tests/unit/http/` | The [streaming](/ai/streaming.md) format, both directions | nothing |
| `tests/api/` | Each route handler: auth, validation, status codes, streaming, what gets stored | fake DB, fake Clerk, stubbed Gemini |
| `tests/integration/` | A whole user journey across routes: sign up by webhook, create a chat, follow up, delete; user isolation; search and citations; outage recovery | the same fakes, state carried between steps |
| `tests/live/` | The real Gemini API: chat streaming, title generation, grounded search | your `BOT_API` key and free-tier quota |

# Running

| Command | Runs |
|---------|------|
| `npm test` | unit, api and integration (offline, about a second) |
| `npm run test:live` | the live tests; they skip themselves without `BOT_API` and read `.env` if present |
| `npm run check` | lint, typecheck, `npm test` and `npm run okf:check` |

`npm test` needs Node's module mocking (`--experimental-test-module-mocks`), which is why the repo targets a recent Node ([development](/operations/development.md)).

# Helpers (`tests/helpers/`)

* `gemini.ts`: `stubGemini({ replies, title })` replaces `axios.post`, tells chat, search and title calls apart by URL, and records them. Also `stream(...)`, `failure(status)` and `searchCall(query)` for building replies.
* `db.ts`: `createFakeDb()`, an in-memory Prisma stand-in covering only the calls the routes make, with a clock that always moves forward so ordering is testable.
* `routes.ts`: `mockServerDeps()` fakes Clerk and Prisma (call it before importing a route), plus `request()`, `readEvents()` and `deltasOf()`.

# Writing tests here

* No test touches the network, a real database or real Clerk. Anything that does belongs in `tests/live/`.
* Route tests load the route with a dynamic `import()` inside `before()`, after `mockServerDeps()`, because module mocks only affect modules loaded afterwards. Each test file runs in its own process, so mocks do not leak between files.
* `tests/setup.ts` runs before every file: it silences the app's log lines (`TEST_VERBOSE=1` shows them) and sets `GEMINI_HEDGE_MS` to 40 ms so hedging tests are fast. Health memory is reset by `stubGemini()`, so tests do not affect each other.
* New logic with a branch, a parser, a security check or a data write needs a test that fails when it breaks. Prove it by breaking the code once and watching the test fail.
* Live tests spend the free tier's ~20 requests a day per model. Run them rarely and never in a loop.
* Live tests may only assert things true of any correct answer (a title is short, search returns sources), never exact wording.

# What the tests do not cover

The browser UI (`Chat.tsx` rendering and `readReply`) has no automated tests, and the live tests are not run automatically.
