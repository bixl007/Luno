---
type: UI Component
title: Chat interface
description: Client-side dashboard that lists chats, sends messages, renders Markdown replies and offers copy, speech and PDF export.
resource: ../../src/components/chat/Chat.tsx
tags: [ui, react, dashboard]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:00:00Z }
---

`/dashboard` (`src/app/dashboard/page.tsx`) renders `Chat` from `src/components/chat/` and is protected by the [auth](/auth.md) middleware.

# What it does

* **Chats:** Loads the chat list from `GET /api/chat`, messages from `GET /api/message?chatId=`, sends with `POST /api/message`, starts a new chat with `POST /api/chat`, deletes with `DELETE /api/chat?chatId=`. See [API](/api/index.md).
* **Rendering:** Replies are **streamed**: `readReply` reads the [stream](/ai/streaming.md), shows the `status` text (for example "Searching the web…") next to the loading dots, then replaces them with the text as `delta` events arrive, and finally swaps in the saved message from the `done` event. Replies go through `ChatMessage.tsx`: `react-markdown` with `remark-gfm`, Prism syntax highlighting and a copy button on code blocks. The source list the model flow appends ([reply loop](/ai/reply-loop.md)) is ordinary Markdown, so it renders as a link list under a rule.
* **Actions:** Copy a message or a code block to the clipboard, read a message aloud with the browser's speech synthesis, export a single message to PDF with `jspdf` (plain text layout). Feedback is shown with `react-hot-toast`.
* **Identity:** Clerk's `UserButton` and `useUser`.

A search is visible as the "Searching the web…" status and the appended source list.
