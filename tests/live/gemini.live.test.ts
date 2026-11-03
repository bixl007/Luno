// Opt-in checks against the real Gemini API. They use a little of your free-tier quota, so they are not part of `npm test`.
// Run them with `npm run test:live`; they skip themselves when BOT_API is not set.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGeminiResponse } from "@/lib/ai/reply";
import { fallbackTitle, generateChatTitle } from "@/lib/ai/title";
import { webSearch } from "@/lib/ai/webSearch";
import type { StreamEvent } from "@/lib/http/ndjson";

const skip = process.env.BOT_API ? false : "BOT_API is not set";

test("the chat model streams an answer", { skip, timeout: 60000 }, async () => {
  const events: StreamEvent[] = [];

  const text = await generateGeminiResponse("Reply with exactly one word: pong", null, (event) => events.push(event));

  assert.match(text, /pong/i);
  assert.ok(events.some((event) => event.type === "delta"), "text arrived as deltas");
  assert.doesNotMatch(text, /technical problem|overloaded|rate limit/, "this was a real answer, not a fallback message");
});

test("the title model writes a short title that is not just the message", { skip, timeout: 30000 }, async () => {
  const message = "Help me plan a five day trip to Japan in spring with a focus on food";

  const title = await generateChatTitle(message);

  assert.notEqual(title, fallbackTitle(message), "the model answered instead of the fallback");
  assert.ok(title.length > 0 && title.length <= 60, title);
  assert.ok(title.split(" ").length <= 8, title);
});

test("grounded search returns a summary and sources", { skip, timeout: 60000 }, async () => {
  const result = await webSearch("What is the latest stable release of Node.js?");

  assert.ok(result, "search succeeded (this needs the free grounding quota on the search model)");
  assert.ok(result.summary.length > 0);
  assert.ok(result.sources.length > 0);
});
