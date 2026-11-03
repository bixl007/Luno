---
type: Prisma Model
title: User
description: "A person (Clerk user id as primary key) or the synthetic assistant user with id luno-ai."
resource: ../../prisma/schema.prisma
tags: [data, prisma, auth]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:10:00Z }
---

# Schema

| Field | Type | Notes |
|-------|------|-------|
| `id` | String, primary key | The Clerk user id, no generated default |
| `username` | String?, unique | |
| `email` | String, unique | Placeholder `<id>@noemail.local` if created before the webhook |
| `preferences` | Json? | Profile and personalisation settings (nickname, occupation, bio, style, instructions, accent colour, Chopper on or off). Validated by `src/lib/preferences.ts`; invalid stored values fall back to the defaults. See [/api/preferences](/api/preferences.md) |
| `chats` | [Chat](/data/chat.md)[] | |
| `messages` | [Message](/data/message.md)[] | |
| `createdAt` | DateTime | Default now |

# Notes

* Rows are created by the [Clerk webhook](/api/clerk-webhook.md) or on demand by [/api/chat](/api/chat.md).
* The assistant is stored as a user with id `luno-ai`, email `luno-ai@local` and username `Luno`, upserted before each assistant message so that every [message](/data/message.md) has an author.
