---
type: API Endpoint
title: /api/message
description: List a chat's messages, or post a user message and receive the stored AI reply.
resource: ../../src/app/api/message/route.ts
tags: [api, messages, gemini]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:10:00Z }
---

Both methods need a Clerk session ([auth](/auth.md)); without one they return `401`.

| Method | Input | Result |
|--------|-------|--------|
| `GET` | query `chatId` | [Messages](/data/message.md) of that chat, oldest first; `404` unless the chat belongs to the signed-in user |
| `POST` | JSON `{ chatId, content, model?, attachments? }` | A [stream](/ai/streaming.md) whose `done` event carries `{ user, assistant }`, the two stored messages (`assistant` is `null` if the model gave nothing) |

`model` is a model id from the picker (missing, `auto` or unknown means Auto) and `attachments` is up to four `{ name, mimeType, data }` files with base64 `data` ([models and files](/ai/models-and-files.md)). `POST` returns `400` when `chatId` is missing, when there is neither text nor a file, or when an attachment is refused (the body says why), and `404` when the [chat](/data/chat.md) does not exist or belongs to someone else. These, and `401`, are plain JSON responses sent before any streaming starts.

# POST flow

Check the chat belongs to the user, start the stream, and call `generateGeminiResponse(content, chat.context, send, { model, attachments, preferences })` ([reply loop](/ai/reply-loop.md)) while the user message, the `updatedAt` bump and the `luno-ai` upsert are saved alongside it (the model does not need the database, so saving adds no waiting). The file names, not the files, are stored on the message so `status` and `delta` events flow to the browser, store the reply as role `assistant` under the synthetic `luno-ai` user, append to the chat's [context](/data/chat-context.md) with the source list stripped, and send `done`. The full sequence is in [request flow](/request-flow.md).

The route sets `maxDuration = 60` because a reply with web search makes several sequential calls, see [limits and quotas](/operations/limits-and-quotas.md).
