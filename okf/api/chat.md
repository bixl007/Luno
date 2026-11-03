---
type: API Endpoint
title: /api/chat
description: List the signed-in user's chats, create a chat (optionally answering a first message), or delete a chat.
resource: ../../src/app/api/chat/route.ts
tags: [api, chat, prisma]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T16:00:00Z }
---

All methods need a Clerk session ([auth](/auth.md)); without one they return `401`.

| Method | Input | Result |
|--------|-------|--------|
| `GET` | none | `[{ id, title }]` for the user's [chats](/data/chat.md), newest `updatedAt` first |
| `POST` | JSON `{ firstMessage? , title? }` (`title` is only used when there is no `firstMessage`) | With `firstMessage`: a [stream](/ai/streaming.md) whose `done` event carries the chat with its messages. Without: the empty chat as plain JSON |
| `DELETE` | query `chatId` | `{ success: true }`; `404` if the chat is missing or not the user's |

# POST details

1. Ensures a [User](/data/user.md) row exists, creating one with a placeholder email if the [webhook](/api/clerk-webhook.md) has not run yet.
2. Without `firstMessage`: creates an empty chat with the given `title`.
3. With `firstMessage`: creates the chat with a provisional title and the user [message](/data/message.md), then starts the stream. A better title is generated in parallel ([chat titles](/ai/chat-title.md)). Inside it the model runs ([reply loop](/ai/reply-loop.md)), `status` and `delta` events are sent as they happen, the route stores the reply as an assistant message of the synthetic user `luno-ai` (created on demand), and sets the chat's [context](/data/chat-context.md) to `User: <msg>\nAI: <reply>` with any source list removed, saves the generated title, and finally sends the `done` event with the full chat.

# DELETE details

Deletes the chat's messages first, then the chat. Only the owner may delete.

Part of the [request flow](/request-flow.md).
