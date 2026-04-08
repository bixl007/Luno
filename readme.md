# Luno

Luno is a full-stack AI chat application built with Next.js, Clerk authentication, Prisma, and Gemini.
It provides:

- User authentication (sign in / sign up)
- Persistent chat history per user
- AI responses via Gemini
- A premium dark chat dashboard UI
- Clerk webhook sync to keep user records in your database

## Tech Stack

- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- Styling: Tailwind CSS
- Auth: Clerk
- Database: PostgreSQL + Prisma
- AI: Google Gemini API

## Project Structure

- src/app: App Router pages and API routes
- src/app/components: Chat UI components
- src/utils: Runtime helpers (Prisma client, model selector, etc.)
- prisma: Prisma schema and migrations

## Prerequisites

Install these before local setup:

- Node.js 20+
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
GEMINI_MODEL="gemini-2.5-flash-lite"

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
Model defaults to gemini-2.5-flash-lite (fast/free profile) and can be changed via GEMINI_MODEL.

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
	- POST: create chat (optionally with first message)
	- DELETE: delete chat by chatId

- /api/message
	- GET: list messages for a chat
	- POST: add message and get AI response

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
- npm run build: generate Prisma client and build app
- npm run start: start production server
- npm run lint: run ESLint

## License

This project currently has no explicit license file.
