import { generateContent } from "./gemini";

// Google Search grounding is free only on the 2.5 models (500 requests/day, shared); Gemini 3 needs a paid plan.
// gemini-2.5-flash is no longer served to new API keys, so flash-lite is the default and also the fallback: a stale
// GEMINI_SEARCH_MODEL in .env fails over instead of breaking search.
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

/** Searches the web via Google Search grounding; returns null on failure so callers can degrade gracefully. */
export async function webSearch(query: string): Promise<WebSearchResult | null> {
  try {
    console.log(`🔎 Web search: ${query}`);
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
