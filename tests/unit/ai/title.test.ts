import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, fallbackTitle, generateChatTitle } from "@/lib/ai/title";
import { failure, stubGemini } from "../../helpers/gemini";

afterEach(() => mock.restoreAll());

test("cleanTitle strips quotes, labels, markdown and trailing punctuation", () => {
  const cases: [string, string][] = [
    ['"Trip Planning Ideas"', "Trip Planning Ideas"],
    ["Title: Debugging a React Hook", "Debugging a React Hook"],
    ["**Learning Rust Basics**", "Learning Rust Basics"],
    ["Weather in Delhi.", "Weather in Delhi"],
    ["  “Japan Itinerary”  \n\nSome extra explanation", "Japan Itinerary"],
    ["Chat title - Resume Review", "Resume Review"],
    ["", ""],
    ['""', ""],
  ];
  for (const [raw, expected] of cases) assert.equal(cleanTitle(raw), expected, raw);
});

test("cleanTitle cuts a very long title at a word boundary", () => {
  const title = cleanTitle("word ".repeat(40));
  assert.ok(title.length <= 60);
  assert.ok(!title.endsWith(" "));
  assert.match(title, /^(word )*word$/);
});

test("fallbackTitle keeps short messages and trims long ones at a word", () => {
  assert.equal(fallbackTitle("Hello there"), "Hello there");
  assert.equal(fallbackTitle("   "), "New chat");
  assert.equal(fallbackTitle("Explain how closures work in JavaScript please"), "Explain how closures work in…");
  assert.equal(fallbackTitle("a".repeat(80)), `${"a".repeat(30)}…`);
  assert.equal(fallbackTitle("Line one\n\nLine two"), "Line one Line two");
});

test("generateChatTitle returns the cleaned model title", async () => {
  const api = stubGemini({ title: '"Trip Planning Ideas."' });

  const title = await generateChatTitle("Help me plan a trip to Japan in spring");

  assert.equal(title, "Trip Planning Ideas");
  assert.equal(api.titleCalls().length, 1);
  assert.equal(api.titleCalls()[0].model, "gemini-3.1-flash-lite");
});

test("generateChatTitle sends only the start of a very long message", async () => {
  const api = stubGemini({ title: "Long Message" });

  await generateChatTitle("x".repeat(5000));

  assert.equal(api.titleCalls()[0].body.contents[0].parts[0].text.length, 1000);
});

test("generateChatTitle falls back to the message when the model fails", async () => {
  stubGemini({ title: failure(503) });

  assert.equal(await generateChatTitle("Explain how closures work in JavaScript please"), "Explain how closures work in…");
});

test("generateChatTitle falls back when the model returns nothing usable", async () => {
  stubGemini({ title: '""' });

  assert.equal(await generateChatTitle("Short question"), "Short question");
});
