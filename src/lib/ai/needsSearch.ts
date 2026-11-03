// Prompts at or above this length are mostly pasted text, where words like "today" are incidental.
const MAX_AUTO_SEARCH_CHARS = 500;

const FRESH_DATA_PATTERNS: RegExp[] = [
  /\b(today|tonight|right now)\b/,
  /\bthis (morning|evening|week|weekend|month|year)\b/,
  /\b(latest|newest|most recent|breaking|trending)\b/,
  /\bcurrent (price|version|president|prime minister|ceo|champion|rate|status|weather|temperature)\b/,
  /\b(news|headlines|weather|forecast|stock price|share price|exchange rate|live score|match score|final score|who won|release date)\b/,
  /\b20(2[5-9]|3\d)\b/,
];

/** True when a prompt is clearly about fresh facts, so a web search should run before the model answers. */
export function needsFreshData(prompt: string): boolean {
  if (prompt.length > MAX_AUTO_SEARCH_CHARS || prompt.includes("```")) return false;
  const text = prompt.toLowerCase();
  return FRESH_DATA_PATTERNS.some((pattern) => pattern.test(text));
}
