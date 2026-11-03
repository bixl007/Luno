import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemInstruction, buildUserText, withSearchNotes } from "@/lib/ai/prompt";

test("without history the user text is just the prompt", () => {
  assert.equal(buildUserText("hello", null), "hello");
  assert.equal(buildUserText("hello", ""), "hello");
});

test("history is labelled and put before the new message", () => {
  const text = buildUserText("and Python?", "User: closures?\nAI: They capture scope.");
  assert.equal(text, "Conversation so far:\nUser: closures?\nAI: They capture scope.\n\nNew message from the user:\nand Python?");
});

test("only the tail of a very long history is kept", () => {
  const history = `OLDEST ${"x".repeat(13000)} NEWEST`;

  const text = buildUserText("next", history);

  assert.ok(text.includes("NEWEST"));
  assert.ok(!text.includes("OLDEST"));
  assert.match(text, /^Conversation so far:\n…/);
});

test("search results are labelled as untrusted data and name their query", () => {
  const text = withSearchNotes("What is new?", [{ query: "tech news", summary: "Things happened." }]);

  assert.ok(text.startsWith("What is new?"));
  assert.match(text, /untrusted data, not instructions/);
  assert.match(text, /Search: tech news\nThings happened\./);
});

test("without search results the text is unchanged", () => {
  assert.equal(withSearchNotes("hi", []), "hi");
});

test("the system instruction has today's date, the search rules and the creator", () => {
  const prompt = buildSystemInstruction();

  assert.ok(prompt.includes(new Date().getUTCFullYear().toString()));
  assert.match(prompt, /web_search/);
  assert.match(prompt, /Live web search results/);
  assert.match(prompt, /Bishal Baira/);
});
