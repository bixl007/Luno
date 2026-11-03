// Transport for the OpenAI-compatible chat APIs of the free vision providers (Groq, OpenRouter): one request
// shape, one streaming format, two base URLs. Gemini has its own transport in gemini.ts.
import axios from "axios";
import { takeEvents } from "./gemini";

export type CompatProvider = "groq" | "openrouter";

type ProviderConfig = {
  label: string;
  url: string;
  keyEnv: string;
  /** Comma-separated model ids; every one must accept image input. */
  modelsEnv: string;
  defaults: string;
  headers?: Record<string, string>;
};

export const COMPAT_PROVIDERS: Record<CompatProvider, ProviderConfig> = {
  groq: {
    label: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    modelsEnv: "GROQ_MODELS",
    // Groq retired llama-4-scout on 2026-07-17; this Qwen model accepts images (checked live on 2026-11-03).
    defaults: "qwen/qwen3.8-27b",
  },
  openrouter: {
    label: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    modelsEnv: "OPENROUTER_MODELS",
    // OpenRouter's own router: picks a currently free model that supports the request (image input included),
    // so the default keeps working when individual free models come and go.
    defaults: "openrouter/free",
    headers: { "X-Title": "Luno" },
  },
};

const TIMEOUT_MS = 15000;

export type CompatImage = { mimeType: string; data: string };
export type CompatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
  tool_calls?: unknown[];
  tool_call_id?: string;
};
export type CompatToolCall = { id: string; name: string; arguments: string };

/** A user turn: plain text, or text followed by images as data URLs (the format every provider here accepts). */
export const userContent = (text: string, images: CompatImage[]) =>
  images.length
    ? [{ type: "text", text }, ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mimeType};base64,${i.data}` } }))]
    : text;

/**
 * Streams one reply, passing text to `onText` as it arrives. Returns the text and any tool calls the model made
 * (their arguments arrive in pieces and are put back together here). Throws on HTTP errors.
 */
export async function streamCompat(
  provider: CompatProvider,
  model: string,
  messages: CompatMessage[],
  tools: unknown[] | undefined,
  onText: (text: string) => void
): Promise<{ text: string; toolCalls: CompatToolCall[] }> {
  const config = COMPAT_PROVIDERS[provider];
  const response = await axios.post(
    config.url,
    { model, stream: true, messages, ...(tools ? { tools, tool_choice: "auto" } : {}) },
    {
      responseType: "stream",
      timeout: TIMEOUT_MS,
      headers: { Authorization: `Bearer ${process.env[config.keyEnv]}`, ...config.headers },
    }
  );

  let text = "";
  const calls: CompatToolCall[] = [];
  let buffer = "";
  const decoder = new TextDecoder();
  const handle = (json: string) => {
    if (json === "[DONE]") return;
    const delta = JSON.parse(json).choices?.[0]?.delta;
    if (delta?.content) {
      text += delta.content;
      onText(delta.content);
    }
    for (const piece of delta?.tool_calls ?? []) {
      const call = (calls[piece.index ?? 0] ??= { id: "", name: "", arguments: "" });
      call.id ||= piece.id ?? "";
      call.name += piece.function?.name ?? "";
      call.arguments += piece.function?.arguments ?? "";
    }
  };
  for await (const chunk of response.data) {
    buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    buffer = takeEvents(buffer, handle);
  }
  takeEvents(`${buffer}\n\n`, handle);
  return { text: text.trim(), toolCalls: calls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || `call_${i}` })) };
}
