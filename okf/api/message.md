---
type: API Endpoint
title: /api/message
description: List a chat's messages, or post a user message and receive the stored AI reply.
resource: ../../src/app/api/message/route.ts
tags: [api, messages, gemini]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:00:00Z }
---

Both methods need a Clerk session ([auth](/auth.md)); without one they return `401`.

| Method | Input | Result |
|--------|-------|--------|
| `GET` | query `chatId` | [Messages](/data/message.md) of that chat, oldest first |
| `POST` | JSON `{ chatId, content }` | A [stream](/ai/streaming.md) whose `done` event carries `{ user, assistant }`, the two stored messages (`assistant` is `null` if the model gave nothing) |

`POST` returns `400` when `chatId` or `content` is missing and `404` when the [chat](/data/chat.md) does not exist. These, and `401`, are plain JSON responses sent before any streaming starts.

# POST flow

Store the user message, touch `updatedAt`, start the stream, call `generateGeminiResponse(content, chat.context, send)` ([reply loop](/ai/reply-loop.md)) so `status` and `delta` events flow to the browser, store the reply as role `assistant` under the synthetic `luno-ai` user, append to the chat's [context](/data/chat-context.md) with the source list stripped, and send `done`. The full sequence is in [request flow](/request-flow.md).

The route sets `maxDuration = 60` because a reply with web search makes several sequential calls, see [limits and quotas](/operations/limits-and-quotas.md).
