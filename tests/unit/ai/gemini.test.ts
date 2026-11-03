import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { GEMINI_MODELS, errorDetail, geminiEndpoint, shouldFailOver, streamWithFailover, textOf, thinkingConfigFor } from "@/lib/ai/gemini";
import { failure, restoreGemini, stream, stubGemini } from "../../helpers/gemini";

test("endpoints differ for streaming and carry the model and key", () => {
  process.env.BOT_API = "test-key";

  assert.equal(
    geminiEndpoint("gemini-3.8-flash"),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=test-key"
  );
  assert.equal(
    geminiEndpoint("gemini-3.8-flash", true),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse&key=test-key"
  );
});

test("only Gemini 3 models are sent a thinking level", () => {
  assert.ok(thinkingConfigFor("gemini-3.8-flash")?.thinkingConfig.thinkingLevel);
  assert.ok(thinkingConfigFor("gemini-3.1-flash-lite"));
  assert.equal(thinkingConfigFor("gemini-2.5-flash"), undefined);
});

test("failover happens for retired models, overload, rate limits, server errors and network drops only", () => {
  for (const status of [404, 429, 500, 502, 503, 504]) assert.equal(shouldFailOver({ response: { status } }), true, String(status));
  for (const code of ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"]) assert.equal(shouldFailOver({ code }), true, code);
  for (const status of [400, 401, 403]) assert.equal(shouldFailOver({ response: { status } }), false, String(status));
  assert.equal(shouldFailOver(new Error("bug")), false);
  assert.equal(shouldFailOver(undefined), false);
});

test("textOf joins visible text and skips thoughts", () => {
  assert.equal(textOf([{ text: "a", thought: true }, { text: " Hello " }, { functionCall: { name: "x" } }, { text: "world " }]), "Hello world");
  assert.equal(textOf([]), "");
});

test("errorDetail reads a streamed error body", async () => {
  const error = { response: { status: 503, data: Readable.from(['{"error":', '"busy"}']) } };

  assert.equal(await errorDetail(error), '{"error":"busy"}');
});

test("errorDetail falls back to a plain body or the message", async () => {
  assert.deepEqual(await errorDetail({ response: { data: { error: "x" } } }), { error: "x" });
  assert.equal(await errorDetail(new Error("boom")), "boom");
});

test("the model chain starts with the configured model and never lists models Google no longer serves", () => {
  assert.equal(GEMINI_MODELS[0], process.env.GEMINI_MODEL || "gemini-3.8-flash");
  assert.equal(new Set(GEMINI_MODELS).size, GEMINI_MODELS.length, "no duplicates");
  assert.ok(!GEMINI_MODELS.includes("gemini-2.5-flash"), "gemini-2.5-flash 404s for new API keys");
});

test("a model older than Gemini 3 is not sent a thinking level in a real request", async () => {
  const api = stubGemini({ replies: [stream([{ text: "ok" }])] });

  await streamWithFailover(["gemini-2.5-flash-lite"], [{ role: "user", parts: [{ text: "hi" }] }], { system: "s", thinking: true }, () => {});

  assert.equal(api.chatCalls()[0].body.generationConfig, undefined);
  restoreGemini();
});

test("a streamed error body can be read for logging after it was read to classify the error", async () => {
  const error = failure(429, '{"error":{"message":"requests per day limit exceeded"}}');

  await errorDetail(error); // read once, as the failover logic does
  assert.match(String(await errorDetail(error)), /per day limit exceeded/);
});

test("a model that hit its daily quota is not retried on the next reply", async () => {
  const quota = failure(429, '{"error":{"message":"Quota exceeded: requests per day limit exceeded on Free Tier"}}');
  const api = stubGemini({ replies: [quota, stream([{ text: "One." }]), stream([{ text: "Two." }])] });
  const ask = () => streamWithFailover(GEMINI_MODELS, [{ role: "user", parts: [{ text: "hi" }] }], { system: "s", thinking: false }, () => {});

  await ask();
  await ask();

  assert.equal(api.chatCalls().filter((call) => call.model === GEMINI_MODELS[0]).length, 1);
  restoreGemini();
});
