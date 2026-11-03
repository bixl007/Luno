import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "svix";
import { mockServerDeps, request } from "../helpers/routes";

const SECRET = `whsec_${Buffer.from("test-secret-key-0123456789").toString("base64")}`;
const { db } = mockServerDeps();
let route: typeof import("@/app/api/webhooks/clerk/route");

before(async () => {
  route = await import("@/app/api/webhooks/clerk/route");
});
beforeEach(() => {
  db.reset();
  process.env.CLERK_WEBHOOK_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.CLERK_WEBHOOK_SECRET;
});

/** A request signed the way Clerk (Svix) signs its webhooks. */
function signed(event: object, overrides: Record<string, string> = {}) {
  const payload = JSON.stringify(event);
  const id = "msg_test_1";
  const timestamp = new Date();
  const signature = new Webhook(SECRET).sign(id, timestamp, payload);
  return request("POST", "/api/webhooks/clerk", payload, {
    "svix-id": id,
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": signature,
    ...overrides,
  });
}

const userCreated = (data: object) => ({ type: "user.created", data });

test("rejects a request without the Svix headers", async () => {
  const res = await route.POST(request("POST", "/api/webhooks/clerk", "{}"));

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "Missing svix headers" });
});

test("fails loudly when the signing secret is not configured", async () => {
  delete process.env.CLERK_WEBHOOK_SECRET;

  assert.equal((await route.POST(signed(userCreated({ id: "user_1" })))).status, 500);
});

test("rejects a payload whose signature does not verify", async () => {
  const res = await route.POST(signed(userCreated({ id: "user_1" }), { "svix-signature": "v1,aW52YWxpZA==" }));

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "Invalid signature" });
  assert.equal(db.users.size, 0);
});

test("rejects a payload that was changed after signing", async () => {
  const genuine = signed(userCreated({ id: "user_1", email_addresses: [{ email_address: "a@b.co" }] }));
  const tampered = request("POST", "/api/webhooks/clerk", JSON.stringify(userCreated({ id: "attacker", email_addresses: [{ email_address: "x@y.co" }] })), {
    "svix-id": genuine.headers.get("svix-id")!,
    "svix-timestamp": genuine.headers.get("svix-timestamp")!,
    "svix-signature": genuine.headers.get("svix-signature")!,
  });

  assert.equal((await route.POST(tampered)).status, 400);
  assert.equal(db.users.size, 0);
});

test("ignores events other than user.created", async () => {
  const res = await route.POST(signed({ type: "user.updated", data: { id: "user_1" } }));

  assert.deepEqual(await res.json(), { status: "ignored" });
  assert.equal(db.users.size, 0);
});

test("user.created inserts the user with id, username and primary email", async () => {
  const res = await route.POST(
    signed(userCreated({ id: "user_1", username: "bishal", email_addresses: [{ email_address: "b@example.com" }] }))
  );

  assert.equal(res.status, 200);
  assert.deepEqual(
    { id: db.users.get("user_1")?.id, username: db.users.get("user_1")?.username, email: db.users.get("user_1")?.email },
    { id: "user_1", username: "bishal", email: "b@example.com" }
  );
});

test("a repeated user.created does not create a duplicate", async () => {
  const event = userCreated({ id: "user_1", email_addresses: [{ email_address: "b@example.com" }] });

  await route.POST(signed(event));
  const res = await route.POST(signed(event));

  assert.equal(res.status, 200);
  assert.equal(db.users.size, 1);
});

test("user.created without an email is rejected", async () => {
  const res = await route.POST(signed(userCreated({ id: "user_1", email_addresses: [] })));

  assert.equal(res.status, 400);
  assert.equal(db.users.size, 0);
});
