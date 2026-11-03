import { test } from "node:test";
import assert from "node:assert/strict";
import { needsFreshData } from "@/lib/ai/needsSearch";

test("searches for questions about today's or recent facts", () => {
  for (const prompt of [
    "What's the weather today in Delhi?",
    "Any news about OpenAI?",
    "latest iPhone release date",
    "Who won the match last night?",
    "What is the current price of bitcoin?",
    "Best laptops of 2026",
    "What happened this week in tech?",
  ]) {
    assert.equal(needsFreshData(prompt), true, prompt);
  }
});

test("does not search for stable knowledge, writing or code", () => {
  for (const prompt of [
    "Explain closures in JavaScript",
    "Write a poem about the sea",
    "What is the capital of France?",
    "Fix this:\n```js\nconst a = 1\n```\nIt breaks today",
    `Summarize this: ${"lorem ipsum ".repeat(60)} today`,
  ]) {
    assert.equal(needsFreshData(prompt), false, prompt.slice(0, 40));
  }
});

test("time and weather questions are recognised as place questions, other fresh-data questions are not", async () => {
  const { isPlaceNowQuestion } = await import("@/lib/ai/needsSearch");

  for (const prompt of ["what is the current time and weather in bengaluru?", "weather in Paris", "what time is it in Tokyo", "temperature in delhi today"]) {
    assert.equal(isPlaceNowQuestion(prompt), true, prompt);
  }
  for (const prompt of ["latest news about India", "who won the match", "write a poem about rain"]) {
    assert.equal(isPlaceNowQuestion(prompt), false, prompt);
  }
});
