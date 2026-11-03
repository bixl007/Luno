// Drives the real route handlers together, the way the browser does, with the database faked in memory,
// Clerk faked, and Gemini stubbed. Unit and API tests check pieces; this checks they work as one product.
import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "svix";
import { outage, restoreGemini, stream, stubGemini } from "../helpers/gemini";
import { deltasOf, mockServerDeps, readEvents, request } from "../helpers/routes";

const SECRET = `whsec_${Buffer.from("integration-secret-0123456789").toString("base64")}`;
const { db, signInAs } = mockServerDeps();
let chats: typeof import("@/app/api/chat/route");
let messages: typeof import("@/app/api/message/route");
let webhook: typeof import("@/app/api/webhooks/clerk/route");

before(async () => {
  chats = await import("@/app/api/chat/route");
  messages = await import("@/app/api/message/route");
  webhook = await import("@/app/api/webhooks/clerk/route");
});
beforeEach(() => {
  db.reset();
  signInAs(null);
  process.env.CLERK_WEBHOOK_SECRET = SECRET;
});
afterEach(() => {
  restoreGemini();
  delete process.env.CLERK_WEBHOOK_SECRET;
});

async function signUp(id: string, email: string) {
  const payload = JSON.stringify({ type: "user.created", data: { id, email_addresses: [{ email_address: email }] } });
  const when = new Date();
  const res = await webhook.POST(
    request("POST", "/api/webhooks/clerk", payload, {
      "svix-id": `msg_${id}`,
      "svix-timestamp": String(Math.floor(when.getTime() / 1000)),
      "svix-signature": new Webhook(SECRET).sign(`msg_${id}`, when, payload),
    })
  );
  assert.equal(res.status, 200);
}

const sidebar = async () => (await (await chats.GET(request("GET", "/api/chat"))).json()) as { id: number; title: string }[];
const history = async (chatId: number) =>
  (await (await messages.GET(request("GET", `/api/message?chatId=${chatId}`))).json()) as { role: string; content: string }[];

async function finish(res: Response) {
  const events = await readEvents(res);
  const last = events.at(-1);
  assert.equal(last?.type, "done");
  return { events, data: (last as { data: any }).data };
}

test("a new user signs up, chats with Luno across two messages, and deletes the chat", async () => {
  const api = stubGemini({
    replies: [
      stream([{ text: "Spring is lovely " }], [{ text: "in Kyoto." }]),
      stream([{ text: "Book " }], [{ text: "early." }]),
    ],
    title: '"Kyoto Spring Trip."',
  });

  // Sign up through the webhook, then sign in.
  await signUp("user_a", "a@example.com");
  signInAs("user_a");
  assert.deepEqual(await sidebar(), []);

  // First message: a new chat is created and its reply streams in.
  const first = await finish(await chats.POST(request("POST", "/api/chat", { firstMessage: "When should I visit Japan?" })));
  assert.deepEqual(deltasOf(first.events), ["Spring is lovely ", "in Kyoto."]);
  const chatId: number = first.data.id;

  // The sidebar shows the generated title, not the raw message.
  assert.deepEqual(await sidebar(), [{ id: chatId, title: "Kyoto Spring Trip" }]);

  // Follow-up: the model is given the first exchange as history.
  const second = await finish(await messages.POST(request("POST", "/api/message", { chatId, content: "Should I book ahead?" })));
  assert.equal(second.data.assistant.content, "Book early.");
  const followUpPrompt = api.chatCalls()[1].body.contents[0].parts[0].text;
  assert.match(followUpPrompt, /User: When should I visit Japan\?\nAI: Spring is lovely in Kyoto\./);
  assert.match(followUpPrompt, /New message from the user:\nShould I book ahead\?/);

  // The whole conversation reads back in order, and exactly one title call was made.
  assert.deepEqual(
    (await history(chatId)).map((m) => [m.role, m.content]),
    [
      ["user", "When should I visit Japan?"],
      ["assistant", "Spring is lovely in Kyoto."],
      ["user", "Should I book ahead?"],
      ["assistant", "Book early."],
    ]
  );
  assert.equal(api.titleCalls().length, 1, "a follow-up message does not regenerate the title");

  // Deleting the chat removes it and its messages.
  const del = await chats.DELETE(request("DELETE", `/api/chat?chatId=${chatId}`));
  assert.deepEqual(await del.json(), { success: true });
  assert.deepEqual(await sidebar(), []);
  assert.deepEqual(await history(chatId), []);
});

test("users only see their own chats", async () => {
  stubGemini({ replies: [stream([{ text: "A." }]), stream([{ text: "B." }])], title: "Shared Topic" });
  await signUp("user_a", "a@example.com");
  await signUp("user_b", "b@example.com");

  signInAs("user_a");
  const a = await finish(await chats.POST(request("POST", "/api/chat", { firstMessage: "from A" })));
  signInAs("user_b");
  await finish(await chats.POST(request("POST", "/api/chat", { firstMessage: "from B" })));

  assert.equal((await sidebar()).length, 1);
  const deleteOthers = await chats.DELETE(request("DELETE", `/api/chat?chatId=${a.data.id}`));
  assert.equal(deleteOthers.status, 404);
  signInAs("user_a");
  assert.equal((await sidebar()).length, 1, "user A's chat survived user B's delete attempt");
});

test("a time-sensitive question is searched, cited and still keeps history clean", async () => {
  const api = stubGemini({ replies: [stream([{ text: "28°C and clear." }]), stream([{ text: "Same as today." }])] });
  await signUp("user_a", "a@example.com");
  signInAs("user_a");

  const first = await finish(await chats.POST(request("POST", "/api/chat", { firstMessage: "What's the news today in Delhi?" })));
  const reply = first.data.messages.find((m: any) => m.role === "assistant").content;

  assert.equal(api.searchCalls().length, 1);
  assert.match(reply, /28°C and clear\.\n\n---\n\*\*Sources\*\*\n- \[a\.com\]/);

  await finish(await messages.POST(request("POST", "/api/message", { chatId: first.data.id, content: "and tomorrow?" })));
  const followUpPrompt = api.chatCalls()[1].body.contents[0].parts[0].text;
  assert.ok(followUpPrompt.includes("AI: 28°C and clear."));
  assert.ok(!followUpPrompt.includes("Sources"), "citations are not fed back to the model as history");
});

test("the conversation survives a model outage and recovers on the next message", async () => {
  stubGemini({
    replies: [...outage(503), stream([{ text: "Back online." }])],
    title: "Greeting",
  });
  await signUp("user_a", "a@example.com");
  signInAs("user_a");

  const first = await finish(await chats.POST(request("POST", "/api/chat", { firstMessage: "hello" })));
  assert.match(first.data.messages.at(-1).content, /overloaded/, "the outage is shown as a friendly message");

  const second = await finish(await messages.POST(request("POST", "/api/message", { chatId: first.data.id, content: "hello again" })));
  assert.equal(second.data.assistant.content, "Back online.");
  assert.equal((await history(first.data.id)).length, 4);
});
