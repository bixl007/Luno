// Transport layer for the Gemini REST API: endpoints, the model chain with failover, and SSE streaming.
import axios from "axios";
import { markHealthy, markUnhealthy, orderByHealth, troubleOf, type Trouble } from "./modelHealth";

// Newest free-tier Gemini text model first, then free models to fall back on when it is overloaded or gone.
// gemini-2.5-flash is not listed: Google no longer serves it to new API keys (404). gemini-2.5-flash-lite is not either:
// the free tier allows only ~20 requests a day per model, and web search needs all of that model's allowance.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.6-flash,gemini-3.5-flash-lite")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
export const GEMINI_MODELS = [...new Set([GEMINI_MODEL, ...FALLBACK_MODELS])];

const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || "low";
// Silence for this long means the model is hung (seen on gemini-3.8-flash).
const GEMINI_TIMEOUT_MS = 15000;
// A model with no first word after this long gets company: the next model starts alongside it, and the first to answer wins.
const HEDGE_MS = Number(process.env.GEMINI_HEDGE_MS ?? 4000);
// 404 means the model was retired or is not offered to this key, so another model may still work.
const FAILOVER_STATUSES = new Set([404, 429, 500, 502, 503, 504]);
const FAILOVER_CODES = new Set(["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"]);

export type Part = {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown> };
  [key: string]: unknown;
};
export type Content = { role: string; parts: Part[] };
export type CallOptions = { system: string; tools?: unknown[]; thinking: boolean };

export const geminiEndpoint = (model: string, stream = false) =>
  stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${process.env.BOT_API}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.BOT_API}`;

/** Only Gemini 3 models take `thinkingLevel`; older ones reject it. */
export const thinkingConfigFor = (model: string) =>
  model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: THINKING_LEVEL } } : undefined;

export const shouldFailOver = (error: any): boolean =>
  FAILOVER_STATUSES.has(error?.response?.status) || FAILOVER_CODES.has(error?.code);

const reason = (error: any) => error?.response?.status ?? error?.code;

/** Why a model failed, reading the error body when needed (a daily quota is skipped much longer than a per-minute one). */
async function troubleFor(error: any): Promise<Trouble> {
  if (error?.response?.status !== 429) return troubleOf(error);
  return troubleOf(error, JSON.stringify(await errorDetail(error)));
}

/** One non-streaming `generateContent` call, trying each model in turn when one is unavailable; returns the response body. */
export async function generateContent(models: string | string[], body: object, timeoutMs: number) {
  let lastError: unknown;
  for (const model of orderByHealth(Array.isArray(models) ? models : [models])) {
    try {
      const data = (await axios.post(geminiEndpoint(model), body, { timeout: timeoutMs })).data;
      markHealthy(model);
      return data;
    } catch (error) {
      lastError = error;
      if (!shouldFailOver(error)) throw error;
      markUnhealthy(model, await troubleFor(error));
      console.warn(`Gemini ${model} unavailable (${reason(error)}), trying the next model`);
    }
  }
  throw lastError;
}

export const textOf = (parts: Part[]): string =>
  parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();

/** Pulls the `data:` payload out of each complete server-sent event in `buffer`; returns what is left over. */
function takeEvents(buffer: string, onData: (json: string) => void): string {
  const boundary = /\r?\n\r?\n/;
  for (let match = boundary.exec(buffer); match; match = boundary.exec(buffer)) {
    const block = buffer.slice(0, match.index);
    buffer = buffer.slice(match.index + match[0].length);
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (data) onData(data);
  }
  return buffer;
}

type StreamHooks = {
  signal: AbortSignal;
  /** Called when the first part arrives. Returns false if another model already won, so this one must stay silent. */
  claim: () => boolean;
  onText: (text: string) => void;
};

/** One streaming call to one model. Text is passed to `hooks.onText` as it arrives; returns the model's parts untouched. */
async function streamCall(model: string, contents: Content[], options: CallOptions, hooks: StreamHooks): Promise<Part[]> {
  const generationConfig = options.thinking ? thinkingConfigFor(model) : undefined;

  const response = await axios.post(
    geminiEndpoint(model, true),
    {
      systemInstruction: { parts: [{ text: options.system }] },
      contents,
      ...(options.tools ? { tools: options.tools } : {}),
      ...(generationConfig ? { generationConfig } : {}),
    },
    { responseType: "stream", timeout: GEMINI_TIMEOUT_MS, signal: hooks.signal }
  );

  const parts: Part[] = [];
  const decoder = new TextDecoder();
  let buffer = "";
  let claimed = false;
  let lost = false;
  const handle = (json: string) => {
    for (const part of (JSON.parse(json).candidates?.[0]?.content?.parts ?? []) as Part[]) {
      if (!claimed) {
        claimed = true;
        lost = !hooks.claim();
      }
      if (lost) return;
      parts.push(part);
      if (part.text && !part.thought) hooks.onText(part.text);
    }
  };

  for await (const chunk of response.data) {
    buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    buffer = takeEvents(buffer, handle);
  }
  takeEvents(`${buffer}\n\n`, handle);
  return parts;
}

type Attempt = {
  model: string;
  controller: AbortController;
  launchedAt: number;
  done: boolean;
  /** Still had no output when the hedge delay passed. */
  silent: boolean;
};

/**
 * Streams from the first healthy model. If it fails, the next one starts at once; if it merely stays silent for
 * HEDGE_MS, the next one starts alongside it. The first model to produce output wins and the others are cancelled.
 * Once the winner has started answering, an error is final: text may already be on screen, so nothing else is tried.
 * Models that failed, or were slow to answer even when they won, drop behind faster ones for a while (see modelHealth),
 * so a slow newest model costs one slow reply instead of every reply.
 */
export function streamWithFailover(
  models: string[],
  contents: Content[],
  options: CallOptions,
  onText: (text: string) => void
): Promise<{ parts: Part[]; model: string }> {
  const chain = orderByHealth(models);

  return new Promise((resolve, reject) => {
    const attempts: Attempt[] = [];
    let nextIndex = 0;
    let running = 0;
    let winner: Attempt | undefined;
    let settled = false;
    let lastError: unknown;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      for (const attempt of attempts) if (attempt !== winner) attempt.controller.abort();
      finish();
    };

    const claim = (attempt: Attempt): boolean => {
      if (!winner) {
        winner = attempt;
        clearTimeout(hedgeTimer);
        console.log(`⚡ ${attempt.model} answered first, after ${((Date.now() - attempt.launchedAt) / 1000).toFixed(1)}s`);
        for (const other of attempts) {
          if (other === attempt || other.done) continue;
          // A model that stayed silent and then lost to a later one is slow, so skip it for a while.
          if (other.silent) markUnhealthy(other.model, "slow");
          other.controller.abort();
        }
      }
      return winner === attempt;
    };

    const launch = (): boolean => {
      if (winner || settled || nextIndex >= chain.length) return false;
      const attempt: Attempt = { model: chain[nextIndex++], controller: new AbortController(), launchedAt: Date.now(), done: false, silent: false };
      attempts.push(attempt);
      running++;
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(() => {
        for (const other of attempts) if (!other.done) other.silent = true;
        launch();
      }, HEDGE_MS);

      streamCall(attempt.model, contents, options, {
        signal: attempt.controller.signal,
        claim: () => claim(attempt),
        onText,
      }).then(
        (parts) => {
          attempt.done = true;
          running--;
          if (!claim(attempt)) return;
          if (attempt.silent) markUnhealthy(attempt.model, "slow");
          else markHealthy(attempt.model);
          settle(() => resolve({ parts, model: attempt.model }));
        },
        (error) => {
          attempt.done = true;
          running--;
          if (winner === attempt) {
            markUnhealthy(attempt.model, troubleOf(error)); // it broke while answering; do not start the next reply with it
            return settle(() => reject(error));
          }
          if (attempt.controller.signal.aborted) return; // a loser that was cancelled
          lastError = error;
          if (!shouldFailOver(error)) return settle(() => reject(error));
          void troubleFor(error).then((trouble) => {
            markUnhealthy(attempt.model, trouble);
            console.warn(`Gemini ${attempt.model} unavailable (${reason(error)}), trying the next model`);
            if (running === 0 && !launch()) settle(() => reject(lastError));
          });
        }
      );
      return true;
    };

    launch();
  });
}

/** Error bodies of streamed requests arrive as streams; read them so they can be logged. */
export async function errorDetail(error: any): Promise<unknown> {
  if (error?.detail !== undefined) return error.detail; // already read: a stream can only be read once
  const data = error?.response?.data;
  let detail: unknown;
  if (data && typeof data.on === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of data) chunks.push(Buffer.from(chunk));
    detail = Buffer.concat(chunks).toString("utf8");
  } else {
    detail = data ?? error?.message;
  }
  if (error && typeof error === "object") error.detail = detail;
  return detail;
}
