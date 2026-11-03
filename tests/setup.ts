// Loaded before every test file (see the `test` script). Error paths are exercised on purpose, so the app's
// own log lines would drown the results. Set TEST_VERBOSE=1 to see them while debugging.
// Hedging starts the next model after this long without output; keep it tiny so tests of it run fast.
process.env.GEMINI_HEDGE_MS ??= "40";

if (!process.env.TEST_VERBOSE) {
  for (const method of ["log", "info", "warn", "error"] as const) console[method] = () => {};
}
