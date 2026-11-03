---
type: Convention
title: Chat context string
description: "How conversation history is stored in Chat.context and fed back to the model."
resource: ../../src/lib/ai/prompt.ts
tags: [data, context, gemini]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T13:06:00Z }
---

# Format

`Chat.context` ([Chat](/data/chat.md)) is one growing text field. After each exchange the routes append:

```
User: <user message>
AI: <assistant reply>
```

The assistant reply is passed through `withoutSources()` first, so the display-only source list ([reply loop](/ai/reply-loop.md)) is not saved. Otherwise every search turn would spend history space on links and the model might imitate the footer.

# How it is read

`buildUserText` sends only the **last 12,000 characters**, prefixed with an ellipsis if cut, followed by the new message. The field itself is never trimmed, so it keeps growing in the database even though the prompt does not.

# Caveats

* Messages are separated by plain `User:` / `AI:` prefixes, so the text cannot be reliably split back into turns if a message itself contains such a line. The full-fidelity history is in [Message](/data/message.md) rows.
* The cut can land in the middle of a message.
