---
type: Capability
title: Response streaming
description: Replies are streamed from Gemini to the browser as newline-delimited JSON events, so text appears while the model is still writing.
resource: ../../src/lib/http/ndjson.ts
tags: [streaming, ndjson, api, ui]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:00:00Z }
---

# Two hops

1. **Gemini to server.** `streamCall` in `src/lib/ai/gemini.ts` calls `streamGenerateContent?alt=sse`. It reassembles server-sent events that may be split across network chunks, forwards each text part to the reply loop as it arrives, and keeps every part untouched for echoing in the [reply loop](/ai/reply-loop.md).
2. **Server to browser.** The POST endpoints ([/api/message](/api/message.md), [/api/chat](/api/chat.md)) return `ndjsonResponse(...)` from `src/lib/http/ndjson.ts`: one JSON object per line, content type `application/x-ndjson`.

# Event shape

| Event | Meaning |
|-------|---------|
| `{ "type": "status", "text": "Searching the web…" }` | Progress while no text exists yet; shown next to the loading dots |
| `{ "type": "delta", "text": "..." }` | A piece of the reply; append it |
| `{ "type": "done", "data": ... }` | Last event; `data` is what the endpoint used to return as plain JSON (stored message(s) or chat) |
| `{ "type": "error", "message": "..." }` | The server failed outside the model (for example a database error); the UI shows a toast and removes the draft |

Model failures are not `error` events: the reply text becomes a friendly fallback message and the stream still ends with `done` ([chat model](/ai/chat-model.md)).

# Client

`readNdjson` (same file) parses lines as they arrive. `readReply` in `src/components/chat/Chat.tsx` shows `status`, builds the visible message from `delta` events, and swaps in the saved message when `done` arrives. See [chat interface](/ui/chat-ui.md).

# Rules

* Checks that can fail (auth, validation, 404) happen before the stream starts, so they still return normal HTTP status codes and JSON.
* The reply is saved to the database by the route *before* `done` is sent. If the client disconnects mid-stream the run continues (while the host keeps the function alive) and the reply is still stored.
* Streaming does not change the 60 second route limit ([limits and quotas](/operations/limits-and-quotas.md)).
