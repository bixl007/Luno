import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { parseBingRss, parseDuckDuckGo, webSearch } from "@/lib/ai/webSearch";
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

  const result = await webSearch("node direct link");

  assert.equal(result?.sources.length, 2);
  assert.equal(api.ddgCalls()[0].query, "node direct link");
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

const RSS = `<?xml version="1.0" encoding="utf-8" ?><rss version="2.0"><channel><title>Bing: q</title>
  <item><title>India Cricket Schedule &amp; Fixtures</title><link>https://www.espncricinfo.com/team/india-6/fixtures</link><description>Upcoming   matches
    and results.</description><pubDate>Mon, 02 Nov 2026 15:15:00 GMT</pubDate></item>
  <item><title>Matches - BCCI</title><link>https://www.bcci.tv/matches</link><description>Official schedule.</description></item>
  <item><title>Matches - BCCI</title><link>https://www.bcci.tv/matches</link><description>Same page again.</description></item>
  <item><title>No address</title><link></link><description>x</description></item>
</channel></rss>`;

test("Bing RSS items become dated result lines and clean sources, without duplicates", () => {
  const result = parseBingRss(RSS);

  assert.deepEqual(result?.sources, [
    { title: "India Cricket Schedule & Fixtures", url: "https://www.espncricinfo.com/team/india-6/fixtures" },
    { title: "Matches - BCCI", url: "https://www.bcci.tv/matches" },
  ]);
  assert.match(result!.summary, /- India Cricket Schedule & Fixtures \(www\.espncricinfo\.com, 02 Nov 2026\): Upcoming matches and results\./);
  assert.match(result!.summary, /- Matches - BCCI \(www\.bcci\.tv\): Official schedule\./);
});

test("a Bing feed with no items gives nothing", () => {
  assert.equal(parseBingRss("<rss><channel></channel></rss>"), null);
  assert.equal(parseBingRss("not xml at all"), null);
});

test("DuckDuckGo is asked first; Bing and Gemini are not asked when it answers", async () => {
  const api = stubGemini({ ddg: PAGE, bing: RSS });

  const result = await webSearch("node blog");

  assert.equal(result?.sources[0].url, "https://nodejs.org/en/blog");
  assert.equal(api.bingCalls().length, 0);
  assert.equal(api.searchCalls().length, 0);
});

test("when DuckDuckGo gives nothing, Bing's RSS feed is used (as a feed request)", async () => {
  const api = stubGemini({ ddg: "<html></html>", bing: RSS });

  const result = await webSearch("india cricket schedule");

  assert.equal(result?.sources.length, 2);
  assert.equal(api.bingCalls()[0].query, "india cricket schedule");
  assert.equal(api.bingCalls()[0].url, "https://www.bing.com/search");
  assert.equal(api.searchCalls().length, 0);
});

test("results that share no word with the query are dropped, so a bad feed falls through to the next source", async () => {
  const junk = `<rss><channel><item><title>Speed Test by MyBroadband</title><link>https://mybroadband.co.za/speed</link><description>Test your line.</description></item></channel></rss>`;

  assert.equal(parseBingRss(junk, "Bengaluru weather right now"), null);
  assert.equal(parseBingRss(junk)?.sources.length, 1, "without a query nothing is filtered");

  const api = stubGemini({ ddg: "<html></html>", bing: junk });
  const result = await webSearch("Bengaluru weather right now");

  assert.equal(result?.summary, "Fresh facts.", "Gemini's grounded search answered instead");
  assert.equal(api.searchCalls().length, 1);
});

test("when both free pages fail, Gemini's grounded search is still the last resort", async () => {
  const api = stubGemini();

  const result = await webSearch("node version");

  assert.equal(result?.summary, "Fresh facts.");
  assert.equal(api.ddgCalls().length + api.bingCalls().length, 2);
});
