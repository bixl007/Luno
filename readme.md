# Luno

Luno is a full-stack AI chat application built with Next.js, Clerk authentication, Prisma, and Gemini.
It provides:

- User authentication (sign in / sign up)
- Persistent chat history per user
- Streaming AI responses via Gemini, with automatic live web search for questions about today's or recent facts
- Automatic failover to other free Gemini models when the main one is overloaded
- A calm, minimal chat UI with light, dark and system themes
- Clerk webhook sync to keep user records in your database

## Tech Stack

- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- Styling: Tailwind CSS 4 with design tokens in src/app/globals.css
- Auth: Clerk
- Database: PostgreSQL + Prisma
- AI: Google Gemini API

## Project Structure

- src/app: routes only (App Router pages and API routes)
- src/components: chat/ (dashboard UI), landing/ (home page), auth/, theme/, brand/ and ui/ (shared pieces)
- src/lib: ai/ (Gemini transport, prompt, reply loop, titles, web search), db/ (Prisma client), http/ (streaming format)
- tests: unit/, api/, integration/ and live/ tests, plus shared helpers
- prisma: Prisma schema and migrations
- okf: knowledge bundle (see below)

See okf/operations/repository-structure.md for the rules on where new files go.

## Prerequisites

Install these before local setup:

- Node.js 26 (see .nvmrc; run `nvm use`)
- npm (or bun)
- PostgreSQL database (local or hosted)
- Clerk account and app
- Google AI Studio API key (Gemini)

## Local Setup

1. Clone and enter the project

```bash
git clone https://github.com/bixl007/Luno.git
cd Luno
```

2. Install dependencies

```bash
npm install
```

3. Create environment file

```bash
cp .env.example .env
```

If .env.example does not exist yet, create .env manually and use the template below.

4. Set up the database schema

```bash
npx prisma generate
npx prisma migrate deploy
```

For active local development where you may create new migrations:

```bash
npx prisma migrate dev
```

5. Start development server

```bash
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create a .env file at the project root with the following format:

```env
# App
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"

# Gemini
BOT_API="YOUR_GEMINI_API_KEY"
GEMINI_MODEL="gemini-3.8-flash"
GEMINI_FALLBACK_MODELS="gemini-3.6-flash,gemini-3.5-flash-lite"
GEMINI_THINKING_LEVEL="low"
GEMINI_TITLE_MODEL="gemini-3.1-flash-lite"
GEMINI_SEARCH_MODEL="gemini-2.5-flash-lite"

# Optional: free Groq key that adds the Llama 4 Scout vision model to the model picker
GROQ_API_KEY=""
OPENROUTER_API_KEY=""

# Clerk (Frontend + Backend)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxx"
CLERK_SECRET_KEY="sk_test_xxxxxxxxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/signin"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/signup"

# Clerk Webhook (for /api/webhooks/clerk)
CLERK_WEBHOOK_SECRET="whsec_xxxxxxxxx"
```

## How To Get Required Keys

### Clerk Keys

In Clerk Dashboard:

- Copy Publishable Key -> NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- Copy Secret Key -> CLERK_SECRET_KEY
- Configure sign-in/sign-up paths to match this project:
	- NEXT_PUBLIC_CLERK_SIGN_IN_URL=/signin
	- NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

### Clerk Webhook Secret

Set up a Clerk webhook for user.created and point it to:

- /api/webhooks/clerk

Then copy the webhook signing secret to CLERK_WEBHOOK_SECRET.

### Gemini API Key

Create API key from Google AI Studio and place it in BOT_API.
Chat model defaults to gemini-3.8-flash (free tier) and can be changed via GEMINI_MODEL.

If the chat model is overloaded (503), out of quota (429), retired (404) or just slow, Luno tries the models in GEMINI_FALLBACK_MODELS: a model that stays silent for GEMINI_HEDGE_MS (2.5 s) gets company from the next one, the first to answer wins, and models that failed or were slow are tried last for a few minutes.

Free-tier note: Google's free tier allows only about 20 requests per day per model. Each reply uses at least one request, plus one per web search, one per new chat title, and one per hedge. Enable billing on your Google AI project to remove the limit.

Web search: questions that are clearly about today's or recent facts (today, latest, weather, news, prices, scores, recent years) are searched automatically before the model answers, and the model can also call a `web_search` tool itself. Searches run through Google Search grounding on GEMINI_SEARCH_MODEL (gemini-2.5-flash-lite, free up to 500 requests/day; gemini-2.5-flash is no longer served to new API keys and newer models need a paid plan for grounding).

### Free vision models (optional)

The model picker can also offer free vision models. Each provider appears only when its key is set in `.env`:

| Provider | Key from | Variables | Default model |
|----------|----------|-----------|---------------|
| Groq | https://console.groq.com/keys | `GROQ_API_KEY`, `GROQ_MODELS` | `qwen/qwen3.8-27b` |
| OpenRouter | https://openrouter.ai/keys | `OPENROUTER_API_KEY`, `OPENROUTER_MODELS` | `openrouter/free` |

`*_MODELS` is a comma-separated list, so one key can offer several models, but every id must accept images, and model ids change often: check the provider's list. When a Groq or OpenRouter key is set, **Auto** tries that model first (it answers in well under a second, where the free Gemini models can take 3 to 40 s) and falls back to Gemini; set `AUTO_PREFER_GEMINI=1` to reverse that. PDFs and HEIC photos are sent to Gemini instead, because these providers can't read them here. Free limits differ per provider and were not confirmed against their own pages: check your console. Restart the dev server after changing `.env`.

### Files, models and personalisation

Attach up to four images, PDFs or text files (3 MB in total) with the paperclip, by dragging them in, or by pasting an image. Pick a model next to the send button. **Personalise** in the sidebar sets a nickname, response style, custom instructions, accent colour, the read-aloud voice, and whether Chopper, the reindeer on the message box, shows. Run `npx prisma migrate deploy` (or `migrate dev`) once to add the two new columns.

## Running The Project

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## API Endpoints Overview

- /api/chat
	- GET: list chats for authenticated user
	- POST: create chat; with a first message the reply is streamed as newline-delimited JSON events (status, delta, done, error)
	- DELETE: delete chat by chatId

- /api/message
	- GET: list messages for a chat
	- POST: add message; the AI response is streamed as newline-delimited JSON events (status, delta, done, error)

- /api/webhooks/clerk
	- POST: verifies Clerk webhook and inserts user in DB

## Common Issues

1. Prisma Client errors after install
- Run: npx prisma generate

2. Database connection failures
- Recheck DATABASE_URL
- Ensure PostgreSQL is reachable and credentials are correct

3. Clerk auth not working
- Verify publishable and secret keys
- Ensure NEXT_PUBLIC_CLERK_SIGN_IN_URL and NEXT_PUBLIC_CLERK_SIGN_UP_URL are set

4. Webhook signature invalid
- Verify CLERK_WEBHOOK_SECRET exactly matches Clerk dashboard secret

5. Gemini request fails
- Verify BOT_API key is valid
- Optionally switch GEMINI_MODEL if needed

## Scripts

- npm run dev: start Next.js in development
- npm run build: generate Prisma client and build app (do not run while `npm run dev` is running; it overwrites the dev server's files)
- npm run build:check: the same build into .next-check, safe while the dev server runs
- npm run start: start production server
- npm run lint: run ESLint over src and tests
- npm run typecheck: run the TypeScript compiler without emitting
- npm test: unit, api and integration tests (offline, no API key needed)
- npm run test:live: opt-in tests against the real Gemini API (uses a little free-tier quota)
- npm run okf:check: validate the okf/ knowledge bundle
- npm run check: lint, typecheck, tests and okf check in one go

## Git Hooks

Husky installs git hooks on npm install:

- pre-commit runs `npm run check` (lint, typecheck, tests, okf check)
- pre-push runs `npm run build:check`

A failing check stops the commit or push. Set HUSKY=0 to bypass them in an emergency.

## Chat Titles

A new chat is named automatically, like ChatGPT: a small free model (GEMINI_TITLE_MODEL) writes a short title from the first message while the reply streams. If that fails, the start of the message is used.

## Knowledge Bundle (OKF)

The `okf/` folder describes this repository in the [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (v0.2): markdown files with YAML frontmatter covering the architecture, API, data model, AI flow, UI and operations. Humans and AI agents can start at `okf/index.md`.

After changing behavior, update the matching file and `okf/log.md`, then run:

```bash
npm run okf:check
```

## License

This project currently has no explicit license file.
