// The models a user can pick in the composer. Gemini models come from the chat chain in gemini.ts; each other provider
// appears only when its API key is set, so a missing key never shows a model that cannot answer.
import { COMPAT_PROVIDERS, type CompatProvider } from "./compat";
import { GEMINI_MODELS } from "./gemini";

export const AUTO_MODEL = "auto";

export type ModelOption = { id: string; label: string; provider: "auto" | "gemini" | CompatProvider; note: string };

/** "gemini-3.5-flash-lite" becomes "Gemini 3.5 Flash Lite". */
const labelOf = (id: string) => id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");

/** "meta-llama/llama-4-scout-17b-16e-instruct" becomes "Llama 4 Scout 17b 16e"; "openrouter/free" becomes "Free". */
const compatLabel = (id: string) => labelOf(id.split("/").pop()!.replace(/:free$/, "").replace(/-instruct$/, ""));

const idsOf = (provider: CompatProvider): string[] => {
  const config = COMPAT_PROVIDERS[provider];
  // GROQ_MODEL (a single id) was the first name of this setting and still works.
  const raw = process.env[config.modelsEnv] ?? (provider === "groq" ? process.env.GROQ_MODEL : undefined) ?? config.defaults;
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
};

export function availableModels(): ModelOption[] {
  const compat = (Object.keys(COMPAT_PROVIDERS) as CompatProvider[]).flatMap((provider) => {
    const config = COMPAT_PROVIDERS[provider];
    if (!process.env[config.keyEnv]) return [];
    return idsOf(provider).map((id): ModelOption => ({ id, label: `${compatLabel(id)} · ${config.label}`, provider, note: `${config.label} · reads images` }));
  });
  return [
    { id: AUTO_MODEL, label: "Auto", provider: "auto", note: "Fast model first, Gemini if it is busy" },
    ...GEMINI_MODELS.map((id): ModelOption => ({ id, label: labelOf(id), provider: "gemini", note: "Google · reads images and PDFs" })),
    ...compat,
  ];
}

/**
 * The model Auto tries first: the first configured fast provider, because the free Gemini models are often slow or hung
 * (measured 3 to 40 s to a first word) while Groq answers in well under a second. Gemini stays the fallback.
 * Set AUTO_PREFER_GEMINI=1 to make Auto try Gemini first.
 */
export function fastFirstModel(): ModelOption | null {
  if (process.env.AUTO_PREFER_GEMINI === "1") return null;
  return availableModels().find((m) => m.provider !== "auto" && m.provider !== "gemini") ?? null;
}

/** The option the client asked for, or null when it is missing, "auto" or unknown (the caller then uses Auto). */
export function pickModel(id: unknown): ModelOption | null {
  if (typeof id !== "string" || id === AUTO_MODEL) return null;
  return availableModels().find((model) => model.id === id) ?? null;
}
