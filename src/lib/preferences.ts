// Profile and personalisation settings. Pure data and validation, shared by the settings dialog and the API.

export const STYLES = [
  { id: "default", label: "Default", hint: "Luno's usual balanced voice", prompt: "" },
  { id: "friendly", label: "Friendly", hint: "Warm, encouraging, conversational", prompt: "Be warm, encouraging and conversational, like a supportive friend who knows the subject." },
  { id: "professional", label: "Professional", hint: "Polished and precise", prompt: "Be polished and precise, like a considered colleague. No slang, no emoji." },
  { id: "concise", label: "Concise", hint: "Short, straight to the point", prompt: "Be as brief as possible: the answer first, no preamble, no recap, and detail only when asked." },
  { id: "playful", label: "Playful", hint: "Light humour and curiosity", prompt: "Be playful and witty, with light humour and curiosity, while staying accurate and useful." },
  { id: "candid", label: "Candid", hint: "Direct, gives honest pushback", prompt: "Be direct and candid. Point out weak assumptions and say when you disagree, kindly but without hedging." },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export const ACCENTS = [
  { id: "indigo", label: "Indigo", hue: 275 },
  { id: "rose", label: "Rose", hue: 10 },
  { id: "amber", label: "Amber", hue: 65 },
  { id: "emerald", label: "Emerald", hue: 160 },
  { id: "sky", label: "Sky", hue: 235 },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export type Preferences = {
  nickname: string;
  occupation: string;
  about: string;
  instructions: string;
  style: StyleId;
  accent: AccentId;
  /** Chopper, the reindeer who sits on the message box. */
  companion: boolean;
};

export const LIMITS = { nickname: 40, occupation: 80, about: 600, instructions: 800 } as const;

export const DEFAULT_PREFERENCES: Preferences = {
  nickname: "",
  occupation: "",
  about: "",
  instructions: "",
  style: "default",
  accent: "indigo",
  companion: true,
};

const TEXT_FIELDS = ["nickname", "occupation", "about", "instructions"] as const;

/** Strict check for what a client sends: returns the cleaned settings, or null when anything is the wrong type or too long. */
export function parsePreferences(input: unknown): Preferences | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const result: Preferences = { ...DEFAULT_PREFERENCES };

  for (const field of TEXT_FIELDS) {
    const value = raw[field] ?? "";
    if (typeof value !== "string") return null;
    const text = value.trim();
    if (text.length > LIMITS[field]) return null;
    result[field] = text;
  }
  const style = raw.style ?? "default";
  if (!STYLES.some((s) => s.id === style)) return null;
  result.style = style as StyleId;
  const accent = raw.accent ?? "indigo";
  if (!ACCENTS.some((a) => a.id === accent)) return null;
  result.accent = accent as AccentId;
  if (raw.companion !== undefined && typeof raw.companion !== "boolean") return null;
  result.companion = raw.companion ?? true;
  return result;
}

/** Lenient read of what the database holds: anything invalid falls back to the defaults. */
export const readPreferences = (stored: unknown): Preferences => parsePreferences(stored) ?? DEFAULT_PREFERENCES;

export const hueOf = (accent: AccentId) => ACCENTS.find((a) => a.id === accent)!.hue;
