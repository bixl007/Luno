---
type: Process
title: Chat message request flow
description: Step by step path of one user message, from the browser to the stored AI reply.
resource: ../src/app/api/message/route.ts
tags: [flow, chat, gemini]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:10:00Z }
---

# Follow-up message in an existing chat

1. `Chat.tsx` calls `POST /api/message` with `{ chatId, content, model?, attachments? }` and shows a loading placeholder. See [message endpoint](/api/message.md).
2. The route checks the Clerk session ([auth](/auth.md)), loads the [Chat](/data/chat.md), and checks the chat belongs to the user. The user's [Message](/data/message.md) is stored while the reply is generated, not before it.
3. The response becomes a [stream](/ai/streaming.md). Inside it the route calls `generateGeminiResponse(content, chat.context, send, { model, attachments, preferences })`. The [reply loop](/ai/reply-loop.md) builds the prompt from the [system prompt](/ai/system-prompt.md) plus the trailing history, searches first if the question is about fresh facts ([auto search](/ai/auto-search.md)), and may call [web search](/ai/web-search.md) up to two more rounds. If a model is overloaded the next free model is tried ([chat model](/ai/chat-model.md)).
4. The reply (with a source list appended if search was used) is stored as an assistant message owned by the synthetic user `luno-ai`.
5. The route appends `User: ...\nAI: ...` to `chat.context`, with the source list removed. See [chat context](/data/chat-context.md).
6. While this runs the browser receives `status` and `delta` events and renders the reply as it is written. The final `done` event carries `{ user, assistant }` and the UI swaps in the saved message.

# First message of a new chat

`POST /api/chat` with `{ firstMessage }` does steps 2 to 6 in one call, creating the chat as well. A short title is generated alongside the reply and saved before `done` ([chat titles](/ai/chat-title.md)). See [chat endpoint](/api/chat.md).

# When something fails

Gemini errors never become HTTP errors. The model layer returns a friendly fallback message instead, so the user always gets a reply, and the stream still ends with `done`. Details: [Gemini chat model](/ai/chat-model.md). The whole request is limited to 60 seconds, see [Limits and quotas](/operations/limits-and-quotas.md).
