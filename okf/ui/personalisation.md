---
type: Feature
title: Personalisation, voice and Chopper
description: The settings dialog (profile, response style, custom instructions, accent colour), the read-aloud voice, and the Chopper companion on the message box.
resource: ../../src/components/chat/SettingsDialog.tsx
tags: [ui, preferences, voice, companion]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T16:30:00Z }
---

# Settings

The sidebar's **Personalise** button opens `SettingsDialog.tsx` (a native `<dialog>` like the delete confirmation). Saving calls `PUT /api/preferences` ([API](/api/preferences.md)); the chat loads the settings from `GET` on start.

| Setting | Effect |
|---------|--------|
| Nickname | Used in the welcome greeting and in the [system prompt](/ai/system-prompt.md) |
| Occupation, About you, Custom instructions | Sent in the "About the user" section of every prompt; capped at 80, 600 and 800 characters |
| Response style | Default, Friendly, Professional, Concise, Playful or Candid, each a one-line instruction |
| Accent colour | Sets `--accent-hue` on the page; `--brand`, `--brand-soft` and `--ring` are built from it ([design system](/ui/design-system.md)). Applies in the dashboard only |
| Show Chopper | Turns the companion on or off |
| Read-aloud voice | Stored in `localStorage` (`luno.voice`) because voices differ per device; includes a preview button |

# Read-aloud

`useMessageActions.ts` with `speech.ts`. The earlier version spoke the whole reply as one utterance at 0.8 speed with the browser's default voice, which sounds crackly and robotic and makes Chrome stop after about 15 seconds. Now `cleanForSpeech` removes markdown, links, emoji, table bars and the sources list, `chunkForSpeech` splits the text into sentence-sized pieces spoken one after another at normal speed, and `pickVoice` prefers the saved voice, then natural, neural or Google voices in the browser's language, and avoids novelty voices. It is still the browser's built-in speech (no server cost); a neural server voice was not added because Gemini's text-to-speech free-tier terms could not be confirmed.

# Chopper

`Companion.tsx` puts Chopper (`src/components/brand/Chopper.tsx`, which shows `public/chopper.png`, a cutout of artwork supplied by the project owner that carries a One Piece copyright mark: check the licence before deploying publicly. Replace that one file to change him everywhere) on the top edge of the message box with a speech bubble. Lines come from `chopperLines.ts`: general, tech and nature fun facts, One Piece facts, One Piece jokes and random thoughts (about 70 in all, kept under 120 characters), written by hand, with the One Piece ones avoiding plot spoilers, so they cost no model requests. A new line appears every 12 seconds or when he is clicked, and he has different lines while Luno is answering. The first line is fixed so the server and browser render the same HTML. Motion respects `prefers-reduced-motion`.
