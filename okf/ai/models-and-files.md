---
type: Feature
title: Models and files
description: The model picker (Auto, Gemini models, and optional Groq and OpenRouter vision models) and how images, PDFs and text files are sent to the model.
resource: ../../src/lib/ai/models.ts
tags: [models, groq, openrouter, gemini, attachments, vision]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T21:30:00Z }
sources:
  - id: groq-vision
    resource: https://console.groq.com/docs/vision
    title: Groq vision documentation
  - id: groq-deprecations
    resource: https://console.groq.com/docs/deprecations
    title: Groq deprecations
---

# Model picker

`availableModels()` in `src/lib/ai/models.ts` builds the list; the dashboard page passes it to the chat as props, and the composer shows a native select when there is more than one entry (the choice is remembered in `localStorage` under `luno.model`).

| Option | When it appears | Behaviour |
|--------|-----------------|-----------|
| **Auto** | always, first | If a Groq or OpenRouter key is set, that model answers first and Gemini is the fallback; otherwise the normal Gemini chain with hedging and failover ([chat model](/ai/chat-model.md)). Set `AUTO_PREFER_GEMINI=1` to try Gemini first |
| Each Gemini model | one per entry of `GEMINI_MODEL` + `GEMINI_FALLBACK_MODELS` | Only that model is tried. If it fails the user gets the friendly fallback message, since a hedge to another model would ignore the choice |
| **Groq and OpenRouter models** | one entry per id in `GROQ_MODELS` or `OPENROUTER_MODELS`, only when that provider's key is set | Streams from the provider's OpenAI-compatible chat API (`src/lib/ai/compat.ts`, one transport and a small table of URLs, keys and defaults). No `web_search` tool, but automatic search results are still added to the prompt |

Defaults: Groq `qwen/qwen3.8-27b`, OpenRouter `openrouter/free` (OpenRouter's router that picks a currently free model supporting the request, chosen because individual free model ids come and go). Labels are derived from the id, for example "Qwen3.8 27b · Groq". Groq retired `meta-llama/llama-4-scout-17b-16e-instruct` on 2026-07-17 (its deprecations page), which made the first default return `404`; `qwen/qwen3.8-27b` was found in Groq's live model list and accepted an image on 2026-11-03.[^groq-deprecations] Mistral was considered and left out because its API is paid. OpenRouter's model ids and free limits were taken from third-party pages and not confirmed against its own documentation; verify each id in its model list.

The server never trusts the id: `pickModel` returns null for anything that is not in the list, which means Auto. If such a provider fails before any text arrives, or the message has a file it cannot read (a PDF or a HEIC photo), the reply falls back to Gemini and a `status` event says so.

For Groq, the documentation says a request may carry at most 5 images, that a request with base64 images is limited to 4 MB, and that Llama 4 Scout accepts image input.[^groq-vision] The free-tier request limits quoted by third-party pages were not confirmed against Groq's own console, so check yours.

# Files

Rules shared by the browser and the API live in `src/lib/attachments.ts`.

* **Types:** PNG, JPEG, WebP, HEIC/HEIF images, PDFs, and text (`text/*`, JSON, XML, YAML and common source-code extensions that browsers report with no type).
* **Limits:** 4 files and 3 MB in total before base64, which keeps the request under common 4.5 MB platform body limits. The API returns `400` with the reason when a file is refused.
* **Browser:** `src/components/chat/files.ts` shrinks images over 400 KB to at most 1600 px JPEG, reads files as base64, and the composer supports the paperclip button, drag and drop and pasting images.
* **Model:** `attachmentParts` in `src/lib/ai/prompt.ts` sends images and PDFs to Gemini as `inlineData` parts before the text and inlines text files, cut at 60,000 characters, as labelled untrusted data. A message with files and no text is answered as "please look at the attached files".
* **Storage:** only `[{ name, mimeType }]` goes into [Message.attachments](/data/message.md) and a `(Attached: ...)` line into the [chat context](/data/chat-context.md). The files are not stored, so a later follow-up cannot re-read them; the model only has its own earlier description.

[^groq-vision]: Groq vision documentation, console.groq.com/docs/vision.
[^groq-deprecations]: Groq deprecations page, console.groq.com/docs/deprecations.

# Why Auto is fast-first

Measured on 2026-11-03 with one tiny request each: `gemini-3.8-flash` gave no first word in 40 s, `gemini-3.6-flash` took 3.0 s, `gemini-3.5-flash-lite` took 19.7 s, and Groq's Qwen took 0.55 s with an image. Through the app's own code an Auto reply started after 199 ms. The trade-off is quality: a 27B model is less accurate than the Gemini models, so pick a Gemini model in the picker when accuracy matters more than speed.
