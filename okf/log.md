# Luno Update Log

## 2026-11-03
* **Update**: Cut reply latency from 17 s (36 s with search) to roughly 3 to 7 s when the newest model is slow, with [hedged requests and model health memory](/ai/failover.md). Measured live: `gemini-3.8-flash` answers `503` or hangs, `gemini-3.6-flash` takes 2 to 16 s, the lite models answer in about 1 s.
* **Update**: Found the free tier allows about 20 requests a day per model (Google's `429` body). Daily-quota models are now skipped for an hour, `gemini-2.5-flash-lite` left the chat chain to protect search, and [limits and quotas](/operations/limits-and-quotas.md) was corrected.
* **Update**: Fixed web search failing with `404` on `gemini-2.5-flash` ("no longer available to new users"). Search now runs on `gemini-2.5-flash-lite` and fails over across a model chain; chat and search both treat `404` as failover; the chat fallback chain drops `gemini-2.5-flash`. The idle timeout dropped from 25 to 15 seconds. See [web search](/ai/web-search.md) and [chat model](/ai/chat-model.md).
* **Update**: Build checks now write to `.next-check` (`npm run build:check`, used by the pre-push hook) so they no longer overwrite a running dev server's `.next` folder, which had made pages lose their CSS. See [development](/operations/development.md).
* **Update**: Restructured the repository: `src/utils/` became `src/lib/{ai,db,http}/`, components moved out of `src/app/` into `src/components/{chat,landing}/`, and `modelSelector.ts` was split into `gemini.ts`, `prompt.ts` and `reply.ts`. See [repository structure](/operations/repository-structure.md).
* **Creation**: Added generated [chat titles](/ai/chat-title.md) (`GEMINI_TITLE_MODEL`); the client no longer sends a title for the first message.
* **Creation**: Moved tests to a top-level `tests/` folder and added unit, api, integration and opt-in live tests, see [testing](/operations/testing.md).
* **Creation**: Added Husky git hooks (`pre-commit` runs `npm run check`, `pre-push` runs the build) and `npm run lint`, `typecheck` and `check` scripts, see [development](/operations/development.md).
* **Update**: Moved the repository to Node 26 (`.nvmrc`, `engines.node`, `@types/node` 26). `npm run okf:check` now also verifies `resource` paths.
* **Update**: Replies now stream to the browser ([streaming](/ai/streaming.md)); `POST /api/chat` (with a first message) and `POST /api/message` return newline-delimited JSON events instead of one JSON body.
* **Creation**: Added model failover for overloaded models (`GEMINI_FALLBACK_MODELS`, [chat model](/ai/chat-model.md)) after `503 UNAVAILABLE` errors from `gemini-3.8-flash`.
* **Creation**: Added [automatic search](/ai/auto-search.md): prompts about today's or recent facts are searched before the model answers.
* **Creation**: Added `CLAUDE.md` (agent entry point), `GUIDELINES.md` (rules) and `AGENTS.md` at the repository root, pointing agents to this bundle.
* **Creation**: Established this OKF v0.2 bundle covering the app, API, data, AI, UI and operations. Added `npm run okf:check` to validate it.
* **Update**: Moved the chat model to `gemini-3.8-flash` and rewrote the [system prompt](/ai/system-prompt.md). See [Gemini model and search choice](/decisions/gemini-model-and-search.md).
* **Creation**: Added [web search](/ai/web-search.md) through a tool-calling loop ([reply loop](/ai/reply-loop.md)), with a 2-search-per-round cap and a 60 second route limit.
* **Creation**: Added unit tests for the reply loop (`npm test`), see [development](/operations/development.md).

## 2026-04-08
* **Deprecation**: Removed the earlier scraper-based web search and its API routes (`/api/scrape`, `/api/test-search`).
