---
type: Integration
title: Authentication (Clerk)
description: Clerk handles sign-in; middleware guards pages; API routes check the user themselves; a webhook mirrors new users into the database.
resource: ../src/middleware.ts
tags: [auth, clerk, security]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T13:06:00Z }
---

# Pieces

* **Pages:** `src/middleware.ts` runs `clerkMiddleware` and calls `auth.protect()` for `/dashboard(.*)` and `/forum(.*)`. Signed-out visitors are redirected to sign in. There is no `/forum` page yet. Sign-in and sign-up pages are `src/app/signin/[[...signin]]` and `src/app/signup/[[...signup]]`.
* **API routes:** The middleware also runs for `/api` and `/trpc`, but it does not block them. Each route reads the user with `getAuth(req)` and returns `401` when there is none. See [API](/api/index.md).
* **User records:** Clerk's user id is the primary key of the [User](/data/user.md) table. The [Clerk webhook](/api/clerk-webhook.md) creates the row on `user.created`. [/api/chat](/api/chat.md) also creates it on first use if the webhook has not arrived yet (with a placeholder email `<id>@noemail.local`).
* **UI:** `Chat.tsx` uses `useUser` and Clerk's `UserButton`. The home page redirects signed-in users to `/dashboard`.

# Configuration

Keys and sign-in URLs are listed in [Environment](/operations/environment.md).
