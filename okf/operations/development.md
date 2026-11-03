---
type: Runbook
title: Development
description: Install, run, check and commit in Luno locally, including the Node version and the Husky git hooks.
resource: ../../package.json
tags: [dev, setup, quality, husky]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T20:00:00Z }
---

# Setup

1. **Node 26** (`.nvmrc`, and `engines.node` is `>=26`): run `nvm use`. The repo moved to Node 26 on 2026-11-03, the version it is developed on. Tests rely on Node's built-in module mocking and `tsx`. Check your host supports Node 26 before deploying ([limits and quotas](/operations/limits-and-quotas.md)).
2. A PostgreSQL database, a Clerk app and a Google AI Studio key.
3. `npm install`. This runs `prisma generate` and installs the git hooks (`prepare`).
4. Copy `.env.example` to `.env`, see [environment](/operations/environment.md).
5. `npx prisma migrate deploy` for an existing database, or `npx prisma migrate dev` while changing the schema ([data](/data/index.md)).
6. `npm run dev`, then open http://localhost:3000.
7. Point a Clerk `user.created` webhook at `/api/webhooks/clerk` ([webhook](/api/clerk-webhook.md)).

# Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` then `next build` into `.next`. **Do not run it while `npm run dev` is running**: it overwrites the dev server's files and the page loses its CSS and scripts (404s on `/_next/static/...`) until you restart |
| `npm run build:check` | The same build into `.next-check`, safe while the dev server runs. Used by the pre-push hook |
| `npm run start` | Production server |
| `npm run lint` | ESLint over `src` and `tests` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit, api and integration tests, see [testing](/operations/testing.md) |
| `npm run test:live` | Opt-in tests against the real Gemini API |
| `npm run okf:check` | Validates this `okf/` bundle: frontmatter, links and `resource` paths |
| `npm run check` | Lint, typecheck, tests and the bundle check, in that order |

# Git hooks (Husky)

Husky 9 sets `core.hooksPath` to `.husky/_` when you run `npm install` (the `prepare` script). Hooks are plain shell files in `.husky/`:

| Hook | Runs | Why |
|------|------|-----|
| `pre-commit` | `npm run check` | Lint, types, tests and docs must pass before a commit is created |
| `pre-push` | `npm run build:check` | The production build must work before code leaves your machine, without disturbing a running dev server |

If the page ever loses its styling and the terminal shows 404s for `/_next/static/...`, a production build overwrote `.next` under the dev server: stop it, run `rm -rf .next`, and start `npm run dev` again.

A failing check stops the commit or push. Fix the problem rather than skipping the hook. `HUSKY=0 git commit ...` bypasses hooks for a genuine emergency, and CI environments can set `HUSKY=0` to skip installing them. `prepare` is `husky || true`, so installs without dev dependencies do not fail.

# Keeping the bundle valid

After changing behavior, update the matching concept, set its `generated.at`, and add a dated entry at the top of [the log](/log.md). `npm run okf:check` requires frontmatter with a non-empty `type` on every concept, date headings in `log.md`, and links and `resource` paths that resolve.

Where files belong: [repository structure](/operations/repository-structure.md).
