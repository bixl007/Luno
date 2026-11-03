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

export type Body = {
  contents: { role: string; parts: Record<string, any>[] }[];
  tools?: unknown;
  generationConfig?: any;
  systemInstruction?: any;
};
type Kind = "chat" | "search" | "title";
export type Call = { kind: Kind; model: string; body: Body; signal?: AbortSignal };

/**
 * Replaces axios.post so no test touches the network. Calls are told apart by URL:
 * streaming calls are the chat model (answered from `replies` in order, an Error is thrown),
 * a non-streaming call to a 2.5 model is the search model, any other non-streaming call is the title model.
 */
export function stubGemini(options: { replies?: unknown[]; title?: string | Error } = {}) {
  resetModelHealth(); // models that failed in an earlier test must not be skipped in this one
  const replies = [...(options.replies ?? [])];
  const calls: Call[] = [];

  mock.method(axios, "post", async (url: string, body: Body, config: { signal?: AbortSignal } = {}) => {
    const model = /models\/([^:]+):/.exec(url)![1];
    const kind: Kind = url.includes(":streamGenerateContent") ? "chat" : model.startsWith("gemini-2.5") ? "search" : "title";
    calls.push({ kind, model, body, signal: config.signal });

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
  return { chatCalls: ofKind("chat"), searchCalls: ofKind("search"), titleCalls: ofKind("title") };
}

export const restoreGemini = () => (axios.post as any).mock?.restore();
