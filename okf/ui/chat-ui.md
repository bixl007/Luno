---
type: UI Component
title: Chat interface
description: Client-side dashboard that lists chats, sends messages, renders Markdown replies and offers copy, speech and PDF export.
resource: ../../src/components/chat/Chat.tsx
tags: [ui, react, dashboard]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T14:40:00Z }
---

`/dashboard` (`src/app/dashboard/page.tsx`) renders `Chat` from `src/components/chat/` and is protected by the [auth](/auth.md) middleware. Visual rules are in the [design system](/ui/design-system.md).

# Layout

Sidebar (recent chats, new chat), a slim header (chat title, theme toggle, context panel toggle, Clerk `UserButton`), the conversation, and an optional context panel. The sidebar is a persistent column from the `md` breakpoint (collapsible) and a drawer below it. The context panel is a column from `lg` and a drawer below it.

# Files

`Chat.tsx` owns state and the API calls. `Sidebar.tsx`, `EmptyState.tsx`, `Composer.tsx`, `MessageBubble.tsx`, `ChatMessage.tsx` and `ContextPanel.tsx` render the pieces; `useMessageActions.ts` holds copy, read-aloud and PDF export; `types.ts` the shared types.

# What it does

* **Chats:** Loads the chat list from `GET /api/chat`, messages from `GET /api/message?chatId=`, sends with `POST /api/message`, starts a new chat with `POST /api/chat`, deletes with `DELETE /api/chat?chatId=` after a confirmation dialog. A failed delete keeps the chat and shows an error. See [API](/api/index.md).
* **Composer:** an auto-growing textarea. Enter sends, Shift+Enter adds a line.
* **Rendering:** Replies are **streamed**: `readReply` reads the [stream](/ai/streaming.md), shows the `status` text (for example "Searching the web…") next to the loading dots, then replaces them with the text as `delta` events arrive, and finally swaps in the saved message from the `done` event. Replies go through `ChatMessage.tsx`: `react-markdown` with `remark-gfm`, Prism syntax highlighting (light or dark to match the theme) and a copy button on code blocks. The source list the model flow appends ([reply loop](/ai/reply-loop.md)) is ordinary Markdown, so it renders as a link list under a rule.
* **Actions:** Copy a message or a code block to the clipboard, read a message aloud with the browser's speech synthesis, export a single message to PDF with `jspdf` (plain text layout, loaded on first use). Feedback is shown with `react-hot-toast` through `notify`.
* **Context panel:** shows the conversation's title, how many questions were asked, and the **sources** parsed from the appended source lists of its replies, as links.
* **States:** skeletons while the chat list and a conversation load, an empty-list message, the welcome screen with prompt suggestions, the thinking indicator, and error toasts when loading or sending fails.
* **Identity:** Clerk's `UserButton` and `useUser`.

A search is visible as the "Searching the web…" status and the appended source list.
