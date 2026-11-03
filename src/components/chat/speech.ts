// Turns a chat reply into something that sounds right when read aloud: no markdown noise, short chunks, a good voice.

/** Key in localStorage where the settings dialog remembers the voice picked on this device. */
export const VOICE_KEY = "luno.voice";

/** Removes everything a speech engine would read out as noise: markup, links, emoji, table bars and the sources list. */
export function cleanForSpeech(text: string): string {
  const withoutSources = text.split("\n\n---\n**Sources**")[0];
  const plain = withoutSources
    .replace(/```[\s\S]*?```/g, "\nCode block.\n")
    .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, "") // table divider rows
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, ", ")
    .replace(/[*_~]{1,3}([^*_~\n]+)[*_~]{1,3}/g, "$1")
    .replace(/[*_~#]/g, "")
    .replace(/\p{Extended_Pictographic}|‍|️/gu, "");
  // A line break is a pause: end each line like a sentence so the voice does not run lines together.
  return plain
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => (/[.!?:;,]$/.test(line) ? line : `${line}.`))
    .join(" ");
}

/**
 * Splits text at sentence ends into pieces of at most `max` characters. Speaking short pieces one after another avoids
 * the engines that stutter or stop on long input (Chrome cuts off after about 15 seconds).
 */
export function chunkForSpeech(text: string, max = 180): string[] {
  const chunks: string[] = [];
  let current = "";
  const push = (piece: string) => {
    if (current && current.length + piece.length + 1 > max) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current} ${piece}` : piece;
  };
  for (const sentence of text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? []) {
    let rest = sentence.trim();
    // A sentence longer than the limit is cut at the last space before it.
    while (rest.length > max) {
      const at = rest.lastIndexOf(" ", max);
      push(rest.slice(0, at > 0 ? at : max));
      rest = rest.slice(at > 0 ? at : max).trim();
    }
    if (rest) push(rest);
  }
  if (current) chunks.push(current);
  return chunks;
}

type Voice = Pick<SpeechSynthesisVoice, "name" | "lang" | "localService" | "voiceURI">;

/** The saved voice if it still exists, otherwise the most natural-sounding voice in the user's language. */
export function pickVoice<T extends Voice>(voices: T[], saved?: string | null, language = "en-US"): T | undefined {
  const chosen = saved ? voices.find((v) => v.voiceURI === saved) : undefined;
  if (chosen) return chosen;
  const base = language.slice(0, 2).toLowerCase();
  const score = (v: T) => {
    if (!v.lang.toLowerCase().startsWith(base)) return -1;
    let points = v.lang.replace("_", "-").toLowerCase() === language.toLowerCase() ? 2 : 0;
    if (/natural|neural|premium|enhanced/i.test(v.name)) points += 6;
    if (/^google/i.test(v.name)) points += 4;
    if (/samantha|ava|allison|daniel|serena|karen|moira|aria|jenny|libby/i.test(v.name)) points += 3;
    if (/compact|eloquence|novelty|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper|zarvox/i.test(v.name)) points -= 10;
    if (v.localService) points += 1;
    return points;
  };
  return voices.map((v) => ({ v, s: score(v) })).filter(({ s }) => s >= 0).sort((a, b) => b.s - a.s)[0]?.v;
}
