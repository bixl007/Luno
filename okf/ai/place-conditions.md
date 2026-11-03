---
type: Capability
title: Place conditions (time and weather)
description: The place_conditions tool, which returns the exact local time and live weather for a place from Open-Meteo, because a web search cannot answer those questions.
resource: ../../src/lib/ai/conditions.ts
tags: [tools, weather, time, open-meteo]
status: stable
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T01:00:00Z }
sources:
  - id: open-meteo
    resource: https://open-meteo.com/en/docs
    title: Open-Meteo forecast and geocoding API
---

Asked "what is the current time and weather in Bengaluru", a web search returned dictionary pages for the word "current" and generic articles about India, because the answer is not a page that exists. `placeConditions(place)` in `src/lib/ai/conditions.ts` answers it from data instead. Both chat paths (Gemini and the Groq/OpenRouter loop) offer it as the tool `place_conditions`, next to `web_search`, through the shared `runTool` in `src/lib/ai/reply.ts`.

# How it works

1. **Find the place**: `GET geocoding-api.open-meteo.com/v1/search?name=<city>&count=10`. A trailing country or region ("Bengaluru, India") is a hint. `pickPlace` takes the match for the hint if there is one, then the most populous (so "Bangalore" is the Indian city and not a town in Pakistan, which is what the geocoder ranks first).
2. **Get the weather**: `GET api.open-meteo.com/v1/forecast` with `current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` and `timezone=auto`. Weather codes become words (WMO table in the file).
3. **Time**: the server's clock formatted with `Intl.DateTimeFormat` in the place's timezone from step 1, so it is exact to the minute (the weather is updated every 15 minutes, and its own timestamp is reported separately).

The model is given `place`, `local_time`, `weather`, `weather_observed_at` and `source`, and the answer's source list credits "Open-Meteo weather and local time" (Open-Meteo asks for attribution). An unknown place or a failing service returns an error the model must report instead of guessing numbers. Both calls have a 6 second timeout.

Questions that match `isPlaceNowQuestion` (`src/lib/ai/needsSearch.ts`) skip the automatic pre-search, which would search the raw question and get unrelated pages; the model calls the tool instead.

# Limits

Open-Meteo's free service is for non-commercial use with fair-use limits and needs no key. This covers only time and weather. Other live facts (prices, scores, schedules) still go through [web search](/ai/web-search.md).
