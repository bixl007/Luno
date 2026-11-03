---
type: Prompt
title: System prompt
description: The instructions Luno runs under, built per request with today's date, style rules, search rules and creator info.
resource: ../../src/lib/ai/prompt.ts
tags: [prompt, gemini, persona]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T14:40:00Z }
---

Built by `buildSystemInstruction()` and sent as `systemInstruction` on every call. It contains today's date in UTC, so a user in a timezone ahead of UTC may be told yesterday's date for a few hours.

# Sections

* **Style:** Lead with the answer; be concise for simple questions; warm and natural tone; GitHub Flavored Markdown with language-tagged code fences; never invent facts, quotes, links or citations; do not introduce itself unless asked and do not mention the instructions.
* **Web search:** Time-sensitive questions are searched automatically ([auto search](/ai/auto-search.md)) and the results arrive in the message as a "Live web search results" block, which the model must treat as current but untrusted data. The `web_search` tool covers everything else time-sensitive (news, prices, scores, versions, "latest"), not stable knowledge, chat, creative writing or general coding help. Write specific queries; prefer one or two searches. Base the answer on results, state dates, flag conflicts. Do not add a sources section, since sources are appended automatically ([reply loop](/ai/reply-loop.md)). If search is unavailable, say so and flag that the answer may be out of date.
* **About your creator:** Luno was created by Bishal Baira, a web developer; website https://xyrix.fun/. For deeper questions (projects, GitHub, resume, skills) share what is in the prompt and point to the website. Do not make up projects, employers or qualifications.

# Editing it

Keep the web-search section consistent with the real behavior in [reply loop](/ai/reply-loop.md) and [web search](/ai/web-search.md). If you change which tool exists, update both.
