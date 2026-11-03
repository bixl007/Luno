// Remembers which models recently failed, so one bad model costs a single slow request instead of every request.
// State lives in memory, per server process: it is a speed-up, never a source of truth.

const MINUTE = 60_000;
const COOLDOWNS = {
  /** 404: retired, or not offered to this API key. Unlikely to change soon. */
  gone: 60 * MINUTE,
  /** 429 on a per-minute limit: recovers quickly. */
  rateLimited: MINUTE,
  /** 429 on the daily limit (the free tier allows about 20 requests a day per model): not coming back soon. */
  dailyQuota: 60 * MINUTE,
  /** 5xx, timeouts, dropped connections: overloaded or hung. */
  failing: 5 * MINUTE,
  /** Did not answer in time and lost the race to a later model. */
  slow: 5 * MINUTE,
};

export type Trouble = keyof typeof COOLDOWNS;

const skipUntil = new Map<string, number>();

/** `detail` is the error body as text; it tells a daily quota from a per-minute one. */
export function troubleOf(error: any, detail = ""): Trouble {
  const status = error?.response?.status;
  if (status === 404) return "gone";
  if (status === 429) return /per ?day/i.test(detail) ? "dailyQuota" : "rateLimited";
  return "failing";
}

export function markUnhealthy(model: string, trouble: Trouble) {
  skipUntil.set(model, Date.now() + COOLDOWNS[trouble]);
}

export function markHealthy(model: string) {
  skipUntil.delete(model);
}

export function resetModelHealth() {
  skipUntil.clear();
}

/**
 * Models that are fine first, in the order given, then the ones cooling down, soonest to recover first.
 * Nothing is dropped: if every model is cooling down they are all still tried.
 */
export function orderByHealth(models: string[]): string[] {
  const now = Date.now();
  const cooling = (model: string) => (skipUntil.get(model) ?? 0) > now;
  const healthy = models.filter((model) => !cooling(model));
  const recovering = models.filter(cooling).sort((a, b) => skipUntil.get(a)! - skipUntil.get(b)!);
  return [...healthy, ...recovering];
}
