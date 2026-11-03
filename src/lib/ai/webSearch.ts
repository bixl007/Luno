import axios from "axios";
import * as cheerio from "cheerio";
import { generateContent } from "./gemini";

// Search tries DuckDuckGo's results page, then Bing's RSS feed (neither needs a key), then Gemini's Google Search grounding. Checked against a real free key on 2026-11-03:
// both gemini-2.5 models answer 404 ("no longer available to new users") and the Gemini 3 models answer 429 for grounded
// requests, so grounding only works on a paid key. The 2.5 models stay in the list so an older key still works.
const SEARCH_MODELS = [
  ...new Set([process.env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"]),
];
const SEARCH_TIMEOUT_MS = 20000;

export interface SearchSource {
  title: string;
  url: string;
}

export interface WebSearchResult {
  summary: string;
  sources: SearchSource[];
}

const DDG_URL = "https://html.duckduckgo.com/html/";
const BING_URL = "https://www.bing.com/search";
const DDG_TIMEOUT_MS = 8000;
const MAX_RESULTS = 6;
// Short snippets keep the model's input small: every search result is re-sent with each later turn.
const MAX_SNIPPET_CHARS = 220;

type Hit = { title: string; url: string; snippet: string; date?: string };

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Accept-Language": "en-US,en;q=0.9",
};

const FILLER = new Set(["the", "and", "for", "what", "how", "who", "when", "where", "which", "are", "was", "now", "right", "today", "current", "currently", "latest", "about", "with", "from", "this", "that", "please"]);

/**
 * Bing's feed sometimes ignores the query and returns unrelated popular pages (seen for queries containing "now"),
 * so a hit is kept only if its title or snippet shares a word with the query.
 */
function matchesQuery(query: string, hit: Hit): boolean {
  const words = (query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !FILLER.has(w));
  if (words.length === 0) return true;
  const text = `${hit.title} ${hit.snippet}`.toLowerCase();
  return words.some((w) => text.includes(w));
}

/** Turns search hits into the summary the model reads and the source list shown to the user; null if there are none. */
function toResult(hits: Hit[], query?: string): WebSearchResult | null {
  const sources: SearchSource[] = [];
  const lines: string[] = [];
  for (const hit of hits) {
    if (sources.length >= MAX_RESULTS) break;
    if (!/^https?:\/\//.test(hit.url) || !hit.title || sources.some((s) => s.url === hit.url)) continue;
    if (query && !matchesQuery(query, hit)) continue;
    sources.push({ title: hit.title, url: hit.url });
    const where = [new URL(hit.url).hostname, hit.date].filter(Boolean).join(", ");
    lines.push(`- ${hit.title} (${where}): ${hit.snippet.slice(0, MAX_SNIPPET_CHARS)}`);
  }
  return sources.length ? { summary: `Top results for the query:\n${lines.join("\n")}`, sources } : null;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Turns Bing's RSS search feed into a summary and sources; null if it holds no items. Items carry a publish date. */
export function parseBingRss(xml: string, query?: string): WebSearchResult | null {
  const $ = cheerio.load(xml, { xmlMode: true });
  const hits: Hit[] = $("item")
    .map((_, item) => {
      const published = $(item).find("pubDate").first().text(); // "Mon, 02 Nov 2026 15:15:00 GMT"
      return {
        title: clean($(item).find("title").first().text()),
        url: clean($(item).find("link").first().text()),
        snippet: clean($(item).find("description").first().text()),
        date: /^\w{3}, (\d{2} \w{3} \d{4})/.exec(published)?.[1],
      };
    })
    .get();
  return toResult(hits, query);
}

async function searchBing(query: string): Promise<WebSearchResult | null> {
  try {
    const { data } = await axios.get<string>(BING_URL, {
      params: { format: "rss", q: query },
      timeout: DDG_TIMEOUT_MS,
      headers: BROWSER_HEADERS,
      responseType: "text",
    });
    return parseBingRss(data, query);
  } catch (error: any) {
    console.warn("Bing search failed:", error?.code ?? error?.response?.status ?? error?.message);
    return null;
  }
}

/** The link DuckDuckGo shows is a redirect (`/l/?uddg=<real url>`); returns the real address, or null if there is none. */
function realUrl(href: string): string | null {
  try {
    const link = new URL(href, "https://duckduckgo.com");
    const target = link.searchParams.get("uddg") ?? link.href;
    return /^https?:\/\//.test(target) && !new URL(target).hostname.endsWith("duckduckgo.com") ? target : null;
  } catch {
    return null;
  }
}

/** Turns DuckDuckGo's HTML results page into a summary and sources; null if it holds no results (for example a bot check). */
export function parseDuckDuckGo(html: string, query?: string): WebSearchResult | null {
  const $ = cheerio.load(html);
  const hits: Hit[] = $(".result:not(.result--ad)")
    .map((_, element) => {
      const link = $(element).find("a.result__a").first();
      return { title: clean(link.text()), url: realUrl(link.attr("href") ?? "") ?? "", snippet: clean($(element).find(".result__snippet").first().text()) };
    })
    .get();
  return toResult(hits, query);
}

async function searchDuckDuckGo(query: string): Promise<WebSearchResult | null> {
  try {
    const { data } = await axios.get<string>(DDG_URL, {
      params: { q: query },
      timeout: DDG_TIMEOUT_MS,
      headers: BROWSER_HEADERS,
      responseType: "text",
    });
    return parseDuckDuckGo(data, query);
  } catch (error: any) {
    console.warn("DuckDuckGo search failed:", error?.code ?? error?.response?.status ?? error?.message);
    return null;
  }
}

/** Searches the web; returns null when every source fails, so callers can degrade gracefully. */
export async function webSearch(query: string): Promise<WebSearchResult | null> {
  console.log(`🔎 Web search: ${query}`);
  return (await searchDuckDuckGo(query)) ?? (await searchBing(query)) ?? (await searchWithGemini(query));
}

/** Google Search grounding through Gemini. Free keys no longer get it (see the note at the top), so this is the fallback. */
async function searchWithGemini(query: string): Promise<WebSearchResult | null> {
  try {
    const data = await generateContent(
      SEARCH_MODELS,
      {
        systemInstruction: {
          parts: [
            {
              text: `Today is ${new Date().toISOString().slice(0, 10)}. Search the web and report what the most reliable, most recent sources say. Include concrete facts, numbers and dates, and note any disagreement between sources. Do not pad or editorialize.`,
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: query }] }],
        tools: [{ google_search: {} }],
      },
      SEARCH_TIMEOUT_MS
    );

    const candidate = data.candidates?.[0];
    const summary: string = (candidate?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();
    if (!summary) throw new Error("Search returned no content");

    const chunks: { web?: { uri?: string; title?: string } }[] =
      candidate?.groundingMetadata?.groundingChunks ?? [];
    const sources: SearchSource[] = [];
    const seen = new Set<string>();
    for (const chunk of chunks) {
      const url = chunk.web?.uri;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ title: chunk.web?.title || url, url });
    }
    return { summary, sources };
  } catch (error: any) {
    console.error("Web search failed:", error?.response?.data || error.message);
    return null;
  }
}
