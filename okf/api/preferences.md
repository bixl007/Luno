---
type: API Endpoint
title: /api/preferences
description: Read and save the signed-in user's profile and AI personalisation settings.
resource: ../../src/app/api/preferences/route.ts
tags: [api, preferences, personalisation]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-03T15:10:00Z }
---

Both methods need a Clerk session ([auth](/auth.md)); without one they return `401`.

| Method | Input | Result |
|--------|-------|--------|
| `GET` | none | The saved settings, or the defaults for a user who has not saved any |
| `PUT` | JSON settings | The cleaned settings that were saved, or `400` if any field has the wrong type, an unknown choice or too much text |

The shape, limits and validation live in `src/lib/preferences.ts` and are shared with the settings dialog ([personalisation](/ui/personalisation.md)). Settings are stored on the [User](/data/user.md) row as JSON. `PUT` creates the row if the Clerk webhook has not yet. Chat routes read the same settings to build the [system prompt](/ai/system-prompt.md).
