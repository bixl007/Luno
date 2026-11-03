import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GEMINI_MODELS } from "@/lib/ai/gemini";
import { availableModels, pickModel } from "@/lib/ai/models";

const KEYS = ["GROQ_API_KEY", "GROQ_MODEL", "GROQ_MODELS", "OPENROUTER_API_KEY", "OPENROUTER_MODELS"];
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

test("Auto comes first, followed by every Gemini chat model", () => {
  const models = availableModels();

  assert.equal(models[0].id, "auto");
  assert.deepEqual(models.slice(1).map((m) => m.id), GEMINI_MODELS);
  assert.ok(models.every((m) => m.provider === "auto" || m.provider === "gemini"), "no other provider without its key");
});

test("the Groq model appears only when its key is set", () => {
  process.env.GROQ_API_KEY = "test";

  const groq = availableModels().filter((m) => m.provider === "groq");

  assert.equal(groq.length, 1);
  assert.match(groq[0].id, /qwen3\.8/);
});

test("labels are readable", () => {
  assert.ok(availableModels().some((m) => m.label === "Gemini 3.8 Flash" || /^Gemini \d/.test(m.label)));
});

test("an unknown, missing or auto choice means the default chain", () => {
  assert.equal(pickModel(undefined), null);
  assert.equal(pickModel("auto"), null);
  assert.equal(pickModel("made-up-model"), null);
  assert.equal(pickModel(42), null);
  assert.equal(pickModel(GEMINI_MODELS[0])?.id, GEMINI_MODELS[0]);
});

test("Groq cannot be picked without its key", () => {
  assert.equal(pickModel("qwen/qwen3.8-27b"), null);
});

test("a provider appears only with its own key, with readable labels", () => {
  process.env.OPENROUTER_API_KEY = "o";

  const labels = availableModels().filter((m) => m.provider !== "auto" && m.provider !== "gemini").map((m) => [m.provider, m.label]);

  assert.deepEqual(labels, [["openrouter", "Free · OpenRouter"]]);
});

test("a provider's model list can be set, and an old GROQ_MODEL still works", () => {
  process.env.GROQ_API_KEY = "g";
  process.env.GROQ_MODEL = "meta-llama/old-model";
  assert.deepEqual(availableModels().filter((m) => m.provider === "groq").map((m) => m.id), ["meta-llama/old-model"]);

  process.env.GROQ_MODELS = " a/one-instruct, b/two ,";
  const groq = availableModels().filter((m) => m.provider === "groq");
  assert.deepEqual(groq.map((m) => m.id), ["a/one-instruct", "b/two"]);
  assert.deepEqual(groq.map((m) => m.label), ["One · Groq", "Two · Groq"]);
});
