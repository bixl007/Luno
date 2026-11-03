import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES } from "@/lib/preferences";
import { mockServerDeps, request } from "../helpers/routes";

const { db, signInAs } = mockServerDeps();
let route: typeof import("@/app/api/preferences/route");

before(async () => {
  route = await import("@/app/api/preferences/route");
});
beforeEach(() => {
  db.reset();
  signInAs("user_1");
});

test("both methods need a session", async () => {
  signInAs(null);

  assert.equal((await route.GET(request("GET", "/api/preferences"))).status, 401);
  assert.equal((await route.PUT(request("PUT", "/api/preferences", {}))).status, 401);
});

test("a new user gets the defaults", async () => {
  const res = await route.GET(request("GET", "/api/preferences"));

  assert.deepEqual(await res.json(), DEFAULT_PREFERENCES);
});

test("PUT saves cleaned settings for the signed-in user only, even if they had no row yet", async () => {
  const res = await route.PUT(request("PUT", "/api/preferences", { nickname: "  Bix ", style: "playful", accent: "sky", companion: false }));

  assert.equal(res.status, 200);
  assert.equal((await res.json()).nickname, "Bix");
  assert.equal(db.users.get("user_1")!.preferences.style, "playful");
  const back = await (await route.GET(request("GET", "/api/preferences"))).json();
  assert.equal(back.accent, "sky");
  assert.equal(back.companion, false);
  signInAs("user_2");
  assert.deepEqual(await (await route.GET(request("GET", "/api/preferences"))).json(), DEFAULT_PREFERENCES);
});

test("PUT refuses settings that are invalid or unreadable", async () => {
  for (const body of [{ style: "sarcastic" }, { about: "x".repeat(601) }, { nickname: 7 }, "not json{"]) {
    assert.equal((await route.PUT(request("PUT", "/api/preferences", body))).status, 400);
  }
  assert.equal(db.users.size, 0, "nothing is saved");
});
