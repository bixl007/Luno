import type { StreamEvent } from "@/lib/http/ndjson";
import {
  GEMINI_MODELS,
  errorDetail,
  shouldFailOver,
  streamWithFailover,
  textOf,
  type CallOptions,
  type Content,
  type Part,
} from "./gemini";
import { isVisionReadable, kindOf, type Attachment } from "@/lib/attachments";
import type { Preferences } from "@/lib/preferences";
import { streamCompat, userContent, type CompatMessage, type CompatProvider } from "./compat";
import { fastFirstModel, pickModel } from "./models";
import { placeConditions } from "./conditions";
import { isPlaceNowQuestion, needsFreshData } from "./needsSearch";
import {
  attachmentParts,
  buildSystemInstruction,
  buildUserText,
  promptWithFiles,
  withSearchNotes,
  type PromptOptions,
  type SearchNote,
} from "./prompt";
import { webSearch, type SearchSource } from "./webSearch";

// Replies about files: longer silence allowed, and a slower hedge. Kept well under the 60 s route limit.
const FILE_TIMEOUT_MS = 35000;
const FILE_HEDGE_MS = 10000;
const MAX_TOOL_ROUNDS = 2;
// The fast providers' free tiers count input tokens per minute (Groq's Qwen: 7,000), and every round re-sends the whole
// conversation, so they get one search round (the model may still run two searches in it) and then must answer.
const COMPAT_TOOL_ROUNDS = 1;
const MAX_SEARCHES_PER_ROUND = 2;
const MAX_SOURCES = 6;
const SOURCES_MARKER = "\n\n---\n**Sources**\n";

const TOOL_DECLARATIONS = [
  {
    name: "web_search",
    description:
      "Search the web for current or recent information: news, prices, scores, software versions, releases, events, or any fact that may have changed after your training data. Returns a summary of what current sources say. Do not use it for the time or weather in a place: use place_conditions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A specific, self-contained search query. Include the year or other qualifiers when recency matters.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "place_conditions",
    description:
      "Get the exact current local time and the current weather (temperature, conditions, humidity, wind) for a city or town, from live data. Use it for any question about the time or weather in a place.",
    parameters: {
      type: "object",
      properties: {
        place: {
          type: "string",
          description: "A city or town, optionally followed by a country, for example \"Bengaluru, India\" or \"Paris\".",
        },
      },
      required: ["place"],
    },
  },
];

type Emit = (event: StreamEvent) => void;

function appendSources(text: string, sources: SearchSource[]): string {
  if (!text || sources.length === 0) return text;
  const lines = sources.slice(0, MAX_SOURCES).map((s) => `- [${s.title.replace(/[\[\]]/g, "")}](${s.url})`);
  return `${text}${SOURCES_MARKER}${lines.join("\n")}`;
}

/** Drops the appended source list, so it isn't saved into the chat history the model reads back. */
export function withoutSources(text: string): string {
  const at = text.lastIndexOf(SOURCES_MARKER);
  return at === -1 ? text : text.slice(0, at);
}

function creatorBlurb(): string {
  return `**About Luno's creator:** Luno was built by **Bishal Baira**, a web developer focused on clean code, scalable systems and seamless UI. Learn more at https://xyrix.fun/.`;
}

function fallbackMessage(status: number | undefined, prompt: string, code?: string): string {
  const aboutCreator = /creator|developer|who (made|built)/i.test(prompt);
  const extra = aboutCreator ? `\n\n${creatorBlurb()}` : "";

  if (status === 429) {
    return `I'm getting a lot of requests right now and have hit my rate limit. Please try again in a minute.${extra}`;
  }
  if (status === 503) {
    return `The AI models are temporarily overloaded. Please try again in a few moments.${extra}`;
  }
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return `The AI models took too long to start answering. Please try again, or pick a different model from the list.${extra}`;
  }
  return `I ran into a technical problem answering that. Please try again shortly. If it keeps happening, visit https://xyrix.fun/ to reach Luno's creator, Bishal Baira.${extra}`;
}

export type ReplyOptions = {
  /** Model id picked in the composer; missing, "auto" or unknown means the default chain. */
  model?: string;
  attachments?: Attachment[];
  preferences?: Preferences;
};

/**
 * Answers `prompt`, streaming `status` and `delta` events through `emit` as they happen, and returns the full reply.
 * Never throws: failures come back as a friendly fallback message.
 */
export async function generateGeminiResponse(
  rawPrompt: string,
  context?: string | null,
  emit: Emit = () => {},
  { model, attachments = [], preferences }: ReplyOptions = {}
) {
  const prompt = promptWithFiles(rawPrompt, attachments);
  const userText = buildUserText(prompt, context);
  const picked = pickModel(model);
  // Auto (no model picked) tries the fast provider first when one is configured; Gemini remains the fallback.
  const first = picked ?? fastFirstModel();
  const chain = picked?.provider === "gemini" ? [picked.id] : GEMINI_MODELS;
  const callOptions = (tools: boolean, thinking = true): CallOptions => ({
    system: buildSystemInstruction({ preferences }),
    tools: tools ? [{ functionDeclarations: TOOL_DECLARATIONS }] : undefined,
    thinking,
    // Reading images and PDFs takes a model longer before its first word, and each hedge would upload the files again.
    ...(attachments.length ? { timeoutMs: FILE_TIMEOUT_MS, hedgeMs: FILE_HEDGE_MS } : {}),
  });
  const files = attachmentParts(attachments);
  const notes: SearchNote[] = [];
  const sources: SearchSource[] = [];
  let streamed = "";
  const onText = (text: string) => {
    streamed += text;
    emit({ type: "delta", text });
  };

  const search = async (query: string) => {
    emit({ type: "status", text: "Searching the web…" });
    const result = await webSearch(query);
    if (result) {
      notes.push({ query, summary: result.summary });
      sources.push(...result.sources.filter((s) => !sources.some((seen) => seen.url === s.url)));
    }
    return result;
  };

  /**
   * Runs one tool call and returns what the model is told. Every call needs a response, but only the first few run
   * (the search quota is shared by all users).
   */
  async function runTool(name: string, args: Record<string, unknown> | undefined, index: number): Promise<object> {
    const text = (key: string) => (typeof args?.[key] === "string" ? (args[key] as string).trim() : "");
    const input = name === "web_search" ? text("query") : name === "place_conditions" ? text("place") : "";
    if (!input) return { error: "Invalid tool call." };
    if (index >= MAX_SEARCHES_PER_ROUND) return { error: "Too many tool calls at once. Use the results you already have." };

    if (name === "place_conditions") {
      const conditions = await placeConditions(input);
      if (!conditions) return { error: "Could not find that place or its weather. Say so plainly, and do not guess the numbers." };
      const credit = { title: "Open-Meteo weather and local time", url: "https://open-meteo.com/" };
      if (!sources.some((s) => s.url === credit.url)) sources.push(credit);
      return conditions;
    }
    const found = await search(input);
    return found
      ? { query: input, summary: found.summary, sources: found.sources.map((s) => s.title) }
      : { error: "Web search is currently unavailable. Answer from your own knowledge and say it may be out of date." };
  }

  /** The tool loop for the OpenAI-compatible providers: the model may call web_search, then answers from the results. */
  async function compatAnswer(provider: CompatProvider, model: string, content: unknown): Promise<string> {
    const tools = TOOL_DECLARATIONS.map((declaration) => ({ type: "function", function: declaration }));
    const messages: CompatMessage[] = [
      { role: "system", content: buildSystemInstruction({ preferences }) },
      { role: "user", content },
    ];
    for (let round = 0; round <= COMPAT_TOOL_ROUNDS; round++) {
      // On the final round tools are withheld so the model must answer with what it has. Some models still try to call
      // a tool and print the call as text unless they are told plainly.
      const last = round === COMPAT_TOOL_ROUNDS;
      if (last) messages.push({ role: "user", content: "Answer now using the search results above. Do not call any tools and do not search again." });
      const result = await streamCompat(provider, model, messages, last ? undefined : tools, onText);
      if (result.toolCalls.length === 0) return result.text;

      messages.push({
        role: "assistant",
        content: result.text || null,
        tool_calls: result.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } })),
      });
      const answers = await Promise.all(
        result.toolCalls.map((call, index) => {
          let args: Record<string, unknown> | undefined;
          try {
            args = JSON.parse(call.arguments || "{}");
          } catch {
            // Malformed arguments get an error response from runTool.
          }
          return runTool(call.name, args, index);
        })
      );
      result.toolCalls.forEach((call, i) => messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(answers[i]) }));
    }
    return "";
  }

  async function answer(): Promise<string> {
    // Questions that are clearly about fresh facts are searched before the model sees them.
    // Time and weather go to place_conditions instead: searching the raw question returns unrelated pages.
    if (needsFreshData(prompt) && !isPlaceNowQuestion(prompt)) await search(prompt);

    if (first && first.provider !== "gemini") {
      // These providers cannot read PDFs or HEIC photos; anything else is answered by them, with the same search tool.
      const name = first.label.split(" · ").pop();
      if (attachments.every(isVisionReadable)) {
        const images = attachments.filter((a) => kindOf(a.mimeType) === "image");
        const text = [...attachmentParts(attachments.filter((a) => kindOf(a.mimeType) === "text")).map((p) => p.text), withSearchNotes(userText, notes)];
        try {
          const reply = await compatAnswer(first.provider as CompatProvider, first.id, userContent(text.join("\n\n"), images));
          if (reply) return appendSources(reply, sources);
          console.warn(`${name} returned no text, switching to Gemini`);
        } catch (error: any) {
          console.error(`${name} error:`, await errorDetail(error));
          if (streamed) throw error;
        }
        emit({ type: "status", text: `${name} is unavailable, switching to Gemini…` });
      } else {
        emit({ type: "status", text: `${name} can't read these files, using Gemini…` });
      }
    }

    let contents: Content[] = [{ role: "user", parts: [...files, { text: withSearchNotes(userText, notes) }] }];
    let pinned: string | undefined;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // On the final round tools are withheld so the model must answer with what it has.
      const withTools = round < MAX_TOOL_ROUNDS;
      let result: { parts: Part[]; model: string };
      try {
        // After a tool round the model is pinned: its echoed turn carries signatures only that model accepts.
        result = await streamWithFailover(pinned ? [pinned] : chain, contents, callOptions(withTools), onText);
      } catch (error) {
        if (round === 0 || streamed || !shouldFailOver(error)) throw error;
        // Search is already done, so answer from its results on any model that is up.
        contents = [{ role: "user", parts: [...files, { text: withSearchNotes(userText, notes) }] }];
        result = await streamWithFailover(chain, contents, callOptions(false), onText);
      }
      pinned = result.model;

      const calls = result.parts.filter((part) => part.functionCall);
      if (calls.length === 0) {
        const text = textOf(result.parts);
        const reply = appendSources(text, sources);
        if (reply !== text) emit({ type: "delta", text: reply.slice(text.length) });
        return reply;
      }

      // The model's turn is echoed back untouched: Gemini 3 thought signatures ride on these parts.
      contents.push({ role: "model", parts: result.parts });

      const responses = await Promise.all(
        calls.map(async (part, index) => {
          const { name, args } = part.functionCall!;
          return { functionResponse: { name, response: await runTool(name, args, index) } };
        })
      );
      contents.push({ role: "user", parts: responses });
    }
    return "";
  }

  try {
    console.log(`🤖 Sending request (${first && first.provider !== "gemini" ? `${first.id}, then ` : ""}${picked?.provider === "gemini" ? picked.id : GEMINI_MODELS.join(" → ")})`);
    const content = await answer();
    console.log("🤖 AI Response received");
    if (content) return content;
  } catch (error: any) {
    const status: number | undefined = error?.response?.status;
    console.error("Gemini API error:", await errorDetail(error));

    // Text already reached the user, so keep it instead of replacing it with an error.
    if (streamed) return `${streamed.trim()}\n\n_The response was interrupted. Please try again._`;

    if (status === 400) {
      // Retry once with a minimal request: no history, search, or thinking config.
      try {
        console.log("Retrying with a minimal request");
        const { parts } = await streamWithFailover(
          chain,
          [{ role: "user", parts: [...files, { text: prompt }] }],
          callOptions(false, false),
          onText
        );
        const retry = textOf(parts);
        if (retry) return retry;
      } catch (retryError: any) {
        console.error("Retry also failed:", await errorDetail(retryError));
      }
    }
    return fallbackMessage(status, prompt, error?.code);
  }

  return fallbackMessage(undefined, prompt);
}
