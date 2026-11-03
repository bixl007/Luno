---
type: Prisma Model
title: Chat
description: One conversation owned by a user, holding its messages and a running text history used as model context.
resource: ../../prisma/schema.prisma
tags: [data, prisma, chat]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T16:00:00Z }
---

# Schema

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int, primary key | Auto-increment |
| `title` | String? | Provisional (start of the first message), then replaced by a generated title, see [chat titles](/ai/chat-title.md) |
| `context` | String? | Running history, see [chat context](/data/chat-context.md) |
| `createdAt` | DateTime | Default now |
| `updatedAt` | DateTime | Auto-updated; chats are listed by it, newest first |
| `userId` | String | Owner, see [User](/data/user.md) |
| `messages` | [Message](/data/message.md)[] | |

Created and deleted through [/api/chat](/api/chat.md). Deleting removes the messages first.
