---
type: API Endpoint
title: /api/webhooks/clerk
description: Verifies a Clerk (Svix) webhook and inserts newly created users into the database.
resource: ../../src/app/api/webhooks/clerk/route.ts
tags: [api, webhook, clerk, svix]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T13:06:00Z }
---

`POST` only. Configure it in the Clerk dashboard for the `user.created` event and copy the signing secret into `CLERK_WEBHOOK_SECRET` ([environment](/operations/environment.md)).

| Condition | Response |
|-----------|----------|
| Missing `svix-id`, `svix-timestamp` or `svix-signature` header | `400` |
| `CLERK_WEBHOOK_SECRET` not set | `500` |
| Signature does not verify | `400` |
| Event type is not `user.created` | `{ status: "ignored" }` |
| No user id or email in the event | `400` |
| User already exists | The existing [User](/data/user.md) |
| Otherwise | Creates the user with id, username and primary email |

See [authentication](/auth.md).
