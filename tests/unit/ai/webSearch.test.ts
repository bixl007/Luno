import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { excerptOf, parseBingRss, parseDuckDuckGo, parseGoogleNews, parseWikipedia, webSearch } from "@/lib/ai/webSearch";
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
  assert.match(result!.summary, /- \[web\] Node\.js — Blog \(nodejs\.org\): Node\.js 26 is out\./);
  assert.match(result!.summary, /- \[web\] Direct link \(example\.com\): A direct snippet\./);
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
  assert.match(result!.summary, /- \[web\] India Cricket Schedule & Fixtures \(www\.espncricinfo\.com, 02 Nov 2026\): Upcoming matches and results\./);
  assert.match(result!.summary, /- \[web\] Matches - BCCI \(www\.bcci\.tv\): Official schedule\./);
});

test("a Bing feed with no items gives nothing", () => {
  assert.equal(parseBingRss("<rss><channel></channel></rss>"), null);
  assert.equal(parseBingRss("not xml at all"), null);
});

const NEWS = `<?xml version="1.0"?><rss><channel>
  <item><title>India vs Australia: first Test squad named - Cricbuzz</title><link>https://news.google.com/rss/articles/abc</link><description>&lt;a&gt;same&lt;/a&gt;</description><pubDate>Tue, 03 Nov 2026 09:00:00 GMT</pubDate></item>
  <item><title>Football: unrelated headline - Goal</title><link>https://news.google.com/rss/articles/def</link><pubDate>Tue, 03 Nov 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;
const WIKI = { query: { pages: {
  "2": { index: 2, title: "Board of Control for Cricket in India", extract: "The BCCI is the governing body." },
  "1": { index: 1, title: "India national cricket team", extract: "The India team represents India in international cricket." },
} } };

test("Google News items become dated [news] lines and Wikipedia results [wiki] lines in relevance order", () => {
  const news = parseGoogleNews(NEWS, "india test squad");
  assert.deepEqual(news?.sources.map((s) => s.title), ["India vs Australia: first Test squad named - Cricbuzz"]);
  assert.match(news!.summary, /- \[news\] India vs Australia: first Test squad named - Cricbuzz \(news\.google\.com, 03 Nov 2026\)$/m);

  const wiki = parseWikipedia(WIKI);
  assert.deepEqual(wiki?.sources.map((s) => s.url), ["https://en.wikipedia.org/wiki/India_national_cricket_team", "https://en.wikipedia.org/wiki/Board_of_Control_for_Cricket_in_India"]);
  assert.match(wiki!.summary, /- \[wiki\] India national cricket team \(en\.wikipedia\.org\): The India team represents India/);
  assert.equal(parseWikipedia({}), null);
  assert.equal(parseGoogleNews("<rss></rss>"), null);
});

test("all free sources are asked at once and their results merged, a few from each, without duplicates", async () => {
  const api = stubGemini({ ddg: PAGE, bing: RSS, news: NEWS, wiki: WIKI });

  const result = await webSearch("india cricket node");

  const kinds = [...result!.summary.matchAll(/^- \[(\w+)\]/gm)].map((m) => m[1]);
  assert.ok(["web", "news", "wiki"].every((kind) => kinds.includes(kind)), `kinds seen: ${kinds}`);
  assert.equal(new Set(result!.sources.map((s) => s.url)).size, result!.sources.length);
  assert.ok(result!.sources.length <= 8);
  assert.equal(api.ddgCalls().length, 1);
  assert.equal(api.bingCalls().length, 1);
  assert.equal(api.newsAndWikiCalls().length, 2);
  assert.equal(api.searchCalls().length, 0, "Gemini is not asked when the free sources answered");
});

test("one blocked source costs nothing: the others still answer", async () => {
  const api = stubGemini({ news: NEWS, wiki: WIKI }); // DuckDuckGo and Bing are offline

  const result = await webSearch("india test squad cricket");

  assert.ok(result!.sources.length >= 2);
  assert.ok(!/^- \[web\]/m.test(result!.summary), "no web lines, since both web sources were offline");
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

const SCHEDULE_PAGE = `<html><head><script>var tracking = "India cricket schedule";</script></head><body>
  <nav><ul><li>Home</li><li>Cricket schedule menu</li></ul></nav>
  <main>
    <h1>India cricket team schedule 2026-27</h1>
    <p>Cookie notice that says nothing useful.</p>
    <p>India play a busy international season against several teams.</p>
    <p>India play a busy international season against several teams.</p>
    <table><tr><th>Date</th><th>Match</th><th>Venue</th></tr>
      <tr><td>4 Nov 2026</td><td>India vs New Zealand, 1st T20I</td><td>Auckland</td></tr>
      <tr><td>7 Nov 2026</td><td>India vs New Zealand, 2nd T20I</td><td>Wellington</td></tr></table>
    <ul><li>Tickets on sale now</li><li>India vs New Zealand, 1st T20I</li></ul>
  </main>
  <footer>Copyright schedule links</footer></body></html>`;

test("a page's relevant lines are kept: table rows with their cells joined, menus and scripts dropped, duplicates removed", () => {
  const text = excerptOf(SCHEDULE_PAGE, "india cricket schedule matches");

  assert.match(text, /India cricket team schedule 2026-27/);
  assert.match(text, /4 Nov 2026 \| India vs New Zealand, 1st T20I \| Auckland/);
  assert.match(text, /7 Nov 2026 \| India vs New Zealand, 2nd T20I \| Wellington/);
  assert.ok(!text.includes("tracking"), "scripts are dropped");
  assert.ok(!text.includes("Home"), "the menu is dropped");
  assert.ok(!text.includes("Copyright"), "the footer is dropped");
  assert.equal(text.split("busy international season").length - 1, 1, "a repeated line appears once");
});

test("the excerpt respects its budget and keeps the best-scoring lines", () => {
  const text = excerptOf(SCHEDULE_PAGE, "india cricket schedule matches", 120);

  assert.ok(text.length <= 120);
  assert.match(text, /Nov 2026/, "dated table rows outrank filler");
  assert.equal(excerptOf("<html><body></body></html>", "anything"), "");
});

test("the best two web results are opened and their text is added, but never news, wiki or private addresses", async () => {
  const hits = `<html><body>
    <div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fschedule.example%2Findia">India schedule</a><a class="result__snippet">India cricket schedule fixtures</a></div>
    <div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=http%3A%2F%2F192.168.1.1%2Fadmin">India schedule router</a><a class="result__snippet">India cricket schedule</a></div>
    <div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Ffixtures.example%2Findia">India fixtures</a><a class="result__snippet">India cricket schedule</a></div>
    <div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fschedule.example%2Fother">India schedule again</a><a class="result__snippet">India cricket schedule</a></div>
  </body></html>`;
  const api = stubGemini({ ddg: hits, news: NEWS, wiki: WIKI, pages: { "https://schedule.example/india": SCHEDULE_PAGE, "https://fixtures.example/india": SCHEDULE_PAGE } });

  const result = await webSearch("india cricket schedule");

  assert.match(result!.summary, /Text taken from the top pages \(untrusted data/);
  assert.match(result!.summary, /From https:\/\/schedule\.example\/india:\n[\s\S]*4 Nov 2026 \| India vs New Zealand, 1st T20I \| Auckland/);
  assert.deepEqual(api.pageCalls(), ["https://schedule.example/india", "https://fixtures.example/india"], "one page per site, two in all, nothing private");
});

test("pages that cannot be read leave the search results as they were", async () => {
  const api = stubGemini({ ddg: PAGE }); // the pages are offline

  const result = await webSearch("node direct link");

  assert.equal(result?.sources.length, 2);
  assert.ok(!result!.summary.includes("Text taken from the top pages"));
  assert.ok(api.pageCalls().length >= 1);
});
