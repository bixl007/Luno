import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { markHealthy, markUnhealthy, orderByHealth, resetModelHealth, troubleOf } from "@/lib/ai/modelHealth";

beforeEach(resetModelHealth);

test("healthy models keep their order", () => {
  assert.deepEqual(orderByHealth(["a", "b", "c"]), ["a", "b", "c"]);
});

test("a model that failed moves to the back but is never dropped", () => {
  markUnhealthy("a", "failing");

  assert.deepEqual(orderByHealth(["a", "b", "c"]), ["b", "c", "a"]);
});

test("models cooling down are ordered by who recovers first", () => {
  markUnhealthy("a", "gone"); // an hour
  markUnhealthy("b", "rateLimited"); // a minute
  markUnhealthy("c", "failing"); // five minutes

  assert.deepEqual(orderByHealth(["a", "b", "c", "d"]), ["d", "b", "c", "a"]);
});

test("a model that works again is trusted again", () => {
  markUnhealthy("a", "failing");
  markHealthy("a");

  assert.deepEqual(orderByHealth(["a", "b"]), ["a", "b"]);
});

test("troubleOf tells retired models, rate limits, daily quotas and everything else apart", () => {
  assert.equal(troubleOf({ response: { status: 404 } }), "gone");
  assert.equal(troubleOf({ response: { status: 429 } }), "rateLimited");
  assert.equal(troubleOf({ response: { status: 429 } }, "Quota exceeded ... requests per day limit exceeded on Free Tier"), "dailyQuota");
  assert.equal(troubleOf({ response: { status: 429 } }, "GenerateRequestsPerDayPerProjectPerModel-FreeTier"), "dailyQuota");
  assert.equal(troubleOf({ response: { status: 503 } }, "per day"), "failing", "only a 429 is a quota");
  assert.equal(troubleOf({ response: { status: 503 } }), "failing");
  assert.equal(troubleOf({ code: "ECONNABORTED" }), "failing");
});
