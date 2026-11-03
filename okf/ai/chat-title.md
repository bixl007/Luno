---
type: Capability
title: Generated chat titles
description: A new chat is titled by a small free Gemini model from the first message, in parallel with the reply, with a trimmed copy of the message as fallback.
resource: ../../src/lib/ai/title.ts
tags: [title, gemini, chat]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T16:00:00Z }
sources:
  - id: gemini-pricing
    resource: https://ai.google.dev/gemini-api/docs/pricing
    title: Gemini API pricing (free tier per model)
---

Like ChatGPT, a new chat gets a short topic title (2 to 5 words, in the user's language) instead of the raw first message.

# Flow

1. [POST /api/chat](/api/chat.md) with a `firstMessage` creates the chat with a **provisional title**: `fallbackTitle(message)`, the first 30 characters cut at a word with an ellipsis (or `New chat` for an empty message).
2. As the stream starts, `generateChatTitle(firstMessage)` runs **alongside** the reply, so it adds no waiting.
3. After the reply is saved, the route stores the generated title. The `done` event carries the chat with that title, and the sidebar shows it ([chat interface](/ui/chat-ui.md)).
4. Follow-up messages never change the title, and existing chats keep the titles they have.

# The model call

| Setting | Value |
|---------|-------|
| Model | `gemini-3.1-flash-lite`, a free-tier model[^gemini-pricing], `GEMINI_TITLE_MODEL` to change |
| Input | Only the first 1,000 characters of the first message (not the reply) |
| Limits | 8 second timeout, 256 output tokens (room for thinking tokens, which count against the limit) |

A small separate model keeps titles off the chat model's quota and avoids slowing the reply. It costs one extra free-tier request per new chat ([limits and quotas](/operations/limits-and-quotas.md)).

# Cleaning and fallback

`cleanTitle` turns the model's output into a plain single line: it keeps the first line, drops a leading `Title:`, markdown characters, surrounding quotes and trailing punctuation, collapses spaces, and cuts anything over 60 characters at a word. The instruction tells the model to describe the topic and not to follow instructions inside the message, and the cleaned text is stored and rendered as plain text, so a hostile message cannot inject markup.

`generateChatTitle` **never throws**. On any error, timeout or empty result it returns `fallbackTitle(message)`, so a chat always has a title.

# Tests

`tests/unit/ai/title.test.ts` covers cleaning, the fallback and the model call. `tests/api/chat.test.ts` and the [integration test](/operations/testing.md) check that the generated title is saved and shown. `tests/live/gemini.live.test.ts` checks the real model.

[^gemini-pricing]: Gemini API pricing page; both lite models are free of charge on the free tier.
