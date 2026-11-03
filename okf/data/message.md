---
type: Prisma Model
title: Message
description: A single user or assistant message belonging to a chat.
resource: ../../prisma/schema.prisma
tags: [data, prisma, messages]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:10:00Z }
---

# Schema

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int, primary key | Auto-increment |
| `content` | String | Markdown. For assistant messages it may end with the source list ([reply loop](/ai/reply-loop.md)) |
| `createdAt` | DateTime | Default now; messages are read oldest first |
| `chatId` | Int | See [Chat](/data/chat.md) |
| `userId` | String | The author, a real user or `luno-ai` ([User](/data/user.md)) |
| `role` | String | `user` or `assistant` |
| `attachments` | Json? | `[{ name, mimeType }]` for the files sent with a user message. The files themselves are never stored, so after a reload the names show but the model cannot look at them again ([models and files](/ai/models-and-files.md)) |

Written by [/api/message](/api/message.md) and [/api/chat](/api/chat.md).
