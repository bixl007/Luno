import { mock } from "node:test";
import { Readable } from "node:stream";
import axios from "axios";
import { GEMINI_MODELS } from "@/lib/ai/gemini";
import { resetModelHealth } from "@/lib/ai/modelHealth";

/** One server-sent event holding the given parts, as Gemini's streaming API sends them. */
export const sseEvent = (parts: object[]) =>
  `data: ${JSON.stringify({ candidates: [{ content: { role: "model", parts } }] })}\r\n\r\n`;

/** A streamed Gemini reply: each argument is one event holding the given parts. */
export const stream = (...events: object[][]) => ({ data: Readable.from(events.map(sseEvent)) });

export const searchCall = (query: string) => ({ functionCall: { name: "web_search", args: { query } } });

/** An HTTP failure shaped like an axios error, with a streamed body like real streaming requests have. */
export const failure = (status: number, body = "{}") =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: Readable.from([body]) } });

/**
 * A request that never answers until it is cancelled, like a hung model. Use it as a reply:
 * the stub calls it with the request config so it can notice the abort.
 */
export const hang = () => (config: { signal?: AbortSignal }) =>
  new Promise((_, reject) => {
    config.signal?.addEventListener("abort", () => reject(Object.assign(new Error("canceled"), { code: "ERR_CANCELED" })));
  });

/** An error for every model in the chat chain, whatever its length: the whole fleet is down. */
export const outage = (status = 503) => GEMINI_MODELS.map(() => failure(status));

/** What the grounded search model returns. */
export const grounded = {
  data: {
    candidates: [
      {
        content: { parts: [{ text: "Fresh facts." }] },
        groundingMetadata: { groundingChunks: [{ web: { uri: "https://a.com/x", title: "a.com" } }] },
      },
    ],
  },
};

/** A streamed reply from an OpenAI-compatible provider (Groq, OpenRouter), one chunk per argument, ending the way OpenAI-compatible APIs do. */
export const compatStream = (...deltas: string[]) => ({
  data: Readable.from([...deltas.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`), "data: [DONE]\n\n"]),
});

/** A streamed reply in which the model asks for a web search, as OpenAI-compatible providers send it (arguments in pieces). */
export const compatToolStream = (query: string) => {
  const args = JSON.stringify({ query });
  const piece = (tool_calls: object[]) => `data: ${JSON.stringify({ choices: [{ delta: { tool_calls } }] })}\n\n`;
  return {
    data: Readable.from([
      piece([{ index: 0, id: "call_1", function: { name: "web_search", arguments: "" } }]),
      piece([{ index: 0, function: { arguments: args.slice(0, 8) } }]),
      piece([{ index: 0, function: { arguments: args.slice(8) } }]),
      "data: [DONE]\n\n",
    ]),
  };
};

export type Body = {
  contents: { role: string; parts: Record<string, any>[] }[];
  /** Requests to the OpenAI-compatible providers carry these instead of `contents`. */
  model?: string;
  messages?: { role: string; content: any; tool_calls?: any[]; tool_call_id?: string }[];
  tools?: unknown;
  generationConfig?: any;
  systemInstruction?: any;
};
type Kind = "chat" | "search" | "title" | "compat";
export type Call = { kind: Kind; model: string; body: Body; signal?: AbortSignal; url: string; headers?: Record<string, string>; timeout?: number };

/**
 * Replaces axios.post so no test touches the network. Calls are told apart by URL:
 * streaming calls are the chat model (answered from `replies` in order, an Error is thrown),
 * a non-streaming call to a 2.5 model is the search model, any other non-streaming call is the title model.
 */
export function stubGemini(options: { replies?: unknown[]; compatReplies?: unknown[]; title?: string | Error; ddg?: string; bing?: string; news?: string; wiki?: unknown; pages?: Record<string, string>; meteo?: { geo: unknown; forecast: unknown } } = {}) {
  resetModelHealth(); // models that failed in an earlier test must not be skipped in this one
  const replies = [...(options.replies ?? [])];
  const compatReplies = [...(options.compatReplies ?? [])];
  const calls: Call[] = [];
  const ddgCalls: { url: string; query: string }[] = [];

  // Bing, then DuckDuckGo, are searched before Gemini. By default both are offline, so a test falls through to the
  // stubbed Gemini search.
  const bingCalls: { url: string; query: string }[] = [];
  const otherCalls: { url: string; query: string }[] = [];
  const pageCalls: string[] = [];
  mock.method(axios, "get", async (url: string, config: { params?: { q?: string } } = {}) => {
    // Open-Meteo (place_conditions): offline unless the test supplies both answers.
    if (url.includes("open-meteo.com")) {
      if (!options.meteo) throw Object.assign(new Error("offline"), { code: "ENOTFOUND" });
      return { data: url.includes("geocoding") ? options.meteo.geo : options.meteo.forecast };
    }
    // News and Wikipedia take the query under other parameter names.
    const params = (config.params ?? {}) as Record<string, string>;
    const query = params.q ?? params.gsrsearch ?? "";
    const isBing = url.includes("bing.com");
    const isNews = url.includes("news.google.com/rss");
    const isWiki = url.includes("wikipedia.org/w/api.php");
    const isDdg = url.includes("duckduckgo.com");
    if (!isBing && !isNews && !isWiki && !isDdg) {
      // A result page being opened: offline unless the test supplies its HTML.
      pageCalls.push(url);
      const html = options.pages?.[url];
      if (html === undefined) throw Object.assign(new Error("offline"), { code: "ENOTFOUND" });
      return { data: html, headers: { "content-type": "text/html; charset=utf-8" } };
    }
    (isBing ? bingCalls : isNews || isWiki ? otherCalls : ddgCalls).push({ url, query });
    const page = isBing ? options.bing : isNews ? options.news : isWiki ? options.wiki : options.ddg;
    if (page === undefined) throw Object.assign(new Error("offline"), { code: "ENOTFOUND" });
    return { data: page };
  });

  mock.method(axios, "post", async (url: string, body: Body, config: { signal?: AbortSignal; headers?: Record<string, string>; timeout?: number } = {}) => {
    if (!url.includes("generativelanguage.googleapis.com")) {
      calls.push({ kind: "compat", model: body.model!, body, signal: config.signal, url, headers: config.headers });
      const next = compatReplies.shift();
      if (next instanceof Error) throw next;
      return next;
    }
    const model = /models\/([^:]+):/.exec(url)![1];
    const kind: Kind = url.includes(":streamGenerateContent") ? "chat" : model.startsWith("gemini-2.5") ? "search" : "title";
    calls.push({ kind, model, body, signal: config.signal, url, timeout: config.timeout });

    if (kind === "search") return grounded;
    if (kind === "title") {
      const title = options.title ?? "Chat Title";
      if (title instanceof Error) throw title;
      return { data: { candidates: [{ content: { parts: [{ text: title }] } }] } };
    }
    const next = replies.shift();
    if (next instanceof Error) throw next;
    if (typeof next === "function") return next(config);
    return next;
  });

  const ofKind = (kind: Kind) => () => calls.filter((call) => call.kind === kind);
  return { chatCalls: ofKind("chat"), searchCalls: ofKind("search"), titleCalls: ofKind("title"), compatCalls: ofKind("compat"), ddgCalls: () => ddgCalls, bingCalls: () => bingCalls, newsAndWikiCalls: () => otherCalls, pageCalls: () => pageCalls };
}

export const restoreGemini = () => {
  (axios.post as any).mock?.restore();
  (axios.get as any).mock?.restore();
};
