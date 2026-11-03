import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { parseDuckDuckGo, webSearch } from "@/lib/ai/webSearch";
import { resetModelHealth } from "@/lib/ai/modelHealth";
import { failure, stubGemini } from "../../helpers/gemini";

afterEach(() => {
  mock.restoreAll();
  resetModelHealth();
});

// DuckDuckGo is searched first; these tests are about the Gemini fallback, so it is offline here.
const offline = () => mock.method(axios, "get", async () => { throw Object.assign(new Error("offline"), { code: "ENOTFOUND" }); });
const respond = (data: object) => {
  offline();
  return mock.method(axios, "post", async () => ({ data }));
};

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
  offline();
  mock.method(axios, "post", async () => {
    throw failure(429);
  });

  assert.equal(await webSearch("q"), null);
});

test("a retired or rate-limited search model fails over to the next one", async () => {
  const calls: string[] = [];
  offline();
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
  offline();
  mock.method(axios, "post", async (url: string) => {
    calls.push(url);
    throw failure(403);
  });

  assert.equal(await webSearch("q"), null);
  assert.equal(calls.length, 1);
});

// The shape of DuckDuckGo's HTML results page: redirect links, snippets, and an ad that must be skipped.
const PAGE = `<html><body>
  <div class="result result--ad"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fads.example%2Fbuy">Buy now</a><a class="result__snippet">An ad</a></div>
  <div class="result"><h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fnodejs.org%2Fen%2Fblog&amp;rut=abc">Node.js &mdash; Blog</a></h2><a class="result__snippet">Node.js 26 is out.</a></div>
  <div class="result"><a class="result__a" href="https://example.com/direct">Direct   link</a><a class="result__snippet">A direct
   snippet.</a></div>
  <div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fnodejs.org%2Fen%2Fblog">Same page again</a></div>
</body></html>`;

test("DuckDuckGo results become a summary and sources, without ads or duplicates", () => {
  const result = parseDuckDuckGo(PAGE);

  assert.deepEqual(result?.sources, [
    { title: "Node.js — Blog", url: "https://nodejs.org/en/blog" },
    { title: "Direct link", url: "https://example.com/direct" },
  ]);
  assert.match(result!.summary, /- Node\.js — Blog \(nodejs\.org\): Node\.js 26 is out\./);
  assert.match(result!.summary, /- Direct link \(example\.com\): A direct snippet\./);
  assert.ok(!result!.summary.includes("ads.example"));
});

test("a page with no results, such as a bot check, gives nothing", () => {
  assert.equal(parseDuckDuckGo("<html><body><form id='challenge'>Unusual traffic</form></body></html>"), null);
});

test("DuckDuckGo answers first, and Gemini is not asked when it does", async () => {
  const api = stubGemini({ ddg: PAGE });

  const result = await webSearch("node version");

  assert.equal(result?.sources.length, 2);
  assert.equal(api.ddgCalls()[0].query, "node version");
  assert.equal(api.searchCalls().length, 0);
});

test("when DuckDuckGo gives nothing, Gemini's grounded search is used", async () => {
  const api = stubGemini({ ddg: "<html></html>" });

  const result = await webSearch("node version");

  assert.equal(result?.summary, "Fresh facts.");
  assert.equal(api.searchCalls().length, 1);
});

test("when both fail the search returns null instead of throwing", async () => {
  stubGemini({ ddg: "<html></html>" });
  mock.method(axios, "post", async () => { throw failure(404); });

  assert.equal(await webSearch("node version"), null);
});
