import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES, LIMITS, hueOf, parsePreferences, readPreferences } from "@/lib/preferences";

test("an empty object gives the defaults", () => {
  assert.deepEqual(parsePreferences({}), DEFAULT_PREFERENCES);
});

test("text is trimmed and every field is kept", () => {
  const prefs = parsePreferences({ nickname: "  Bix ", occupation: "Dev", about: "Likes tea", instructions: "Be brief", style: "concise", accent: "rose", companion: false });

  assert.deepEqual(prefs, { nickname: "Bix", occupation: "Dev", about: "Likes tea", instructions: "Be brief", style: "concise", accent: "rose", companion: false });
});

test("wrong types, unknown choices and over-long text are refused", () => {
  assert.equal(parsePreferences(null), null);
  assert.equal(parsePreferences("x"), null);
  assert.equal(parsePreferences({ nickname: 5 }), null);
  assert.equal(parsePreferences({ style: "sarcastic" }), null);
  assert.equal(parsePreferences({ accent: "pink" }), null);
  assert.equal(parsePreferences({ companion: "yes" }), null);
  assert.equal(parsePreferences({ about: "x".repeat(LIMITS.about + 1) }), null);
  assert.ok(parsePreferences({ about: "x".repeat(LIMITS.about) }));
});

test("stored junk falls back to the defaults instead of breaking chat", () => {
  assert.deepEqual(readPreferences({ style: "gone" }), DEFAULT_PREFERENCES);
  assert.deepEqual(readPreferences(undefined), DEFAULT_PREFERENCES);
  assert.equal(readPreferences({ nickname: "Bix" }).nickname, "Bix");
});

test("each accent has a hue", () => {
  assert.equal(hueOf("indigo"), 275);
});
