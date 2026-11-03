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
import { needsFreshData } from "./needsSearch";
import { buildSystemInstruction, buildUserText, withSearchNotes, type SearchNote } from "./prompt";
import { webSearch, type SearchSource } from "./webSearch";

const MAX_TOOL_ROUNDS = 2;
const MAX_SEARCHES_PER_ROUND = 2;
const MAX_SOURCES = 6;
const SOURCES_MARKER = "\n\n---\n**Sources**\n";

const WEB_SEARCH_TOOL = {
  functionDeclarations: [
    {
      name: "web_search",
      description:
        "Search the web for current or recent information: news, prices, scores, weather, software versions, releases, events, or any fact that may have changed after your training data. Returns a summary of what current sources say.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A specific, self-contained search query. Include the year or other qualifiers when recency matters.",
          },
        },
        required: ["query"],
      },
    },
  ],
};

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
  return `**About Luno's creator:** Luno was built by **Bishal Baira**, a web developer focused on clean code, scalable systems and seamless UI. Learn more at https://xyrix.xyz/.`;
}

function fallbackMessage(status: number | undefined, prompt: string): string {
  const aboutCreator = /creator|developer|who (made|built)/i.test(prompt);
  const extra = aboutCreator ? `\n\n${creatorBlurb()}` : "";

  if (status === 429) {
    return `I'm getting a lot of requests right now and have hit my rate limit. Please try again in a minute.${extra}`;
  }
  if (status === 503) {
    return `The AI models are temporarily overloaded. Please try again in a few moments.${extra}`;
  }
  return `I ran into a technical problem answering that. Please try again shortly. If it keeps happening, visit https://xyrix.xyz/ to reach Luno's creator, Bishal Baira.${extra}`;
}

const callOptions = (tools: boolean, thinking = true): CallOptions => ({
  system: buildSystemInstruction(),
  tools: tools ? [WEB_SEARCH_TOOL] : undefined,
  thinking,
});

/**
 * Answers `prompt`, streaming `status` and `delta` events through `emit` as they happen, and returns the full reply.
 * Never throws: failures come back as a friendly fallback message.
 */
export async function generateGeminiResponse(prompt: string, context?: string | null, emit: Emit = () => {}) {
  const userText = buildUserText(prompt, context);
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

  async function answer(): Promise<string> {
    // Questions that are clearly about fresh facts are searched before the model sees them.
    if (needsFreshData(prompt)) await search(prompt);
    let contents: Content[] = [{ role: "user", parts: [{ text: withSearchNotes(userText, notes) }] }];
    let pinned: string | undefined;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // On the final round tools are withheld so the model must answer with what it has.
      const withTools = round < MAX_TOOL_ROUNDS;
      let result: { parts: Part[]; model: string };
      try {
        // After a tool round the model is pinned: its echoed turn carries signatures only that model accepts.
        result = await streamWithFailover(pinned ? [pinned] : GEMINI_MODELS, contents, callOptions(withTools), onText);
      } catch (error) {
        if (round === 0 || streamed || !shouldFailOver(error)) throw error;
        // Search is already done, so answer from its results on any model that is up.
        contents = [{ role: "user", parts: [{ text: withSearchNotes(userText, notes) }] }];
        result = await streamWithFailover(GEMINI_MODELS, contents, callOptions(false), onText);
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
          const query = typeof args?.query === "string" ? args.query.trim() : "";
          if (name !== "web_search" || !query) {
            return { functionResponse: { name, response: { error: "Invalid tool call." } } };
          }
          // Every call needs a response, but only the first few actually search (the free search quota is shared by all users).
          if (index >= MAX_SEARCHES_PER_ROUND) {
            return { functionResponse: { name, response: { error: "Too many searches at once. Use the results you already have." } } };
          }
          const found = await search(query);
          if (!found) {
            return {
              functionResponse: {
                name,
                response: { error: "Web search is currently unavailable. Answer from your own knowledge and say it may be out of date." },
              },
            };
          }
          return {
            functionResponse: { name, response: { query, summary: found.summary, sources: found.sources.map((s) => s.title) } },
          };
        })
      );
      contents.push({ role: "user", parts: responses });
    }
    return "";
  }

  try {
    console.log(`🤖 Sending request to Gemini (${GEMINI_MODELS.join(" → ")})`);
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
          GEMINI_MODELS,
          [{ role: "user", parts: [{ text: prompt }] }],
          callOptions(false, false),
          onText
        );
        const retry = textOf(parts);
        if (retry) return retry;
      } catch (retryError: any) {
        console.error("Retry also failed:", await errorDetail(retryError));
      }
    }
    return fallbackMessage(status, prompt);
  }

  return fallbackMessage(undefined, prompt);
}
