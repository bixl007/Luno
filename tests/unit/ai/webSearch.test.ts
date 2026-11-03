import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { webSearch } from "@/lib/ai/webSearch";
import { resetModelHealth } from "@/lib/ai/modelHealth";
import { failure, stubGemini } from "../../helpers/gemini";

afterEach(() => {
  mock.restoreAll();
  resetModelHealth();
});

const respond = (data: object) => mock.method(axios, "post", async () => ({ data }));

test("returns the summary and sources of a grounded search", async () => {
  const api = stubGemini();

  const result = await webSearch("latest gemini");

  assert.equal(result?.summary, "Fresh facts.");
  assert.deepEqual(result?.sources, [{ title: "a.com", url: "https://a.com/x" }]);
  assert.equal(api.searchCalls()[0].model, "gemini-2.5-flash-lite");
  assert.deepEqual(api.searchCalls()[0].body.contents[0].parts[0].text, "latest gemini");
  assert.deepEqual((api.searchCalls()[0].body as any).tools, [{ google_search: {} }]);
});

test("duplicate sources are listed once and untitled ones use their URL", async () => {
  respond({
    candidates: [
      {
        content: { parts: [{ text: "Summary." }] },
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "https://a.com", title: "A" } },
            { web: { uri: "https://a.com", title: "A again" } },
            { web: { uri: "https://b.com" } },
            { web: {} },
          ],
        },
      },
    ],
  });

  const result = await webSearch("q");

  assert.deepEqual(result?.sources, [
    { title: "A", url: "https://a.com" },
    { title: "https://b.com", url: "https://b.com" },
  ]);
});

test("a search with no text is treated as a failure", async () => {
  respond({ candidates: [{ content: { parts: [{ text: "  " }] } }] });

  assert.equal(await webSearch("q"), null);
});

test("an HTTP error returns null instead of throwing", async () => {
  mock.method(axios, "post", async () => {
    throw failure(429);
  });

  assert.equal(await webSearch("q"), null);
});

test("a retired or rate-limited search model fails over to the next one", async () => {
  const calls: string[] = [];
  mock.method(axios, "post", async (url: string) => {
    const model = /models\/([^:]+):/.exec(url)![1];
    calls.push(model);
    if (calls.length === 1) throw failure(404);
    return { data: { candidates: [{ content: { parts: [{ text: "Recovered." }] } }] } };
  });

  const result = await webSearch("q");

  assert.equal(result?.summary, "Recovered.");
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0], calls[1]);
});

test("search never uses a Gemini 3 model, which has no free grounding quota", async () => {
  const api = stubGemini();

  await webSearch("q");

  assert.ok(api.searchCalls().every((call) => call.model.startsWith("gemini-2.5")));
});

test("a client error such as a bad key does not try every model", async () => {
  const calls: string[] = [];
  mock.method(axios, "post", async (url: string) => {
    calls.push(url);
    throw failure(403);
  });

  assert.equal(await webSearch("q"), null);
  assert.equal(calls.length, 1);
});
