import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { failure, outage, restoreGemini, stream, stubGemini } from "../helpers/gemini";
import { deltasOf, mockServerDeps, readEvents, request } from "../helpers/routes";

const { db, signInAs } = mockServerDeps();
let route: typeof import("@/app/api/chat/route");

before(async () => {
  route = await import("@/app/api/chat/route");
});
beforeEach(() => {
  db.reset();
  signInAs("user_1");
});
afterEach(restoreGemini);

const startChat = (firstMessage: string) => route.POST(request("POST", "/api/chat", { firstMessage }));
const doneOf = async (res: Response) => {
  const events = await readEvents(res);
  const done = events.at(-1);
  assert.equal(done?.type, "done", "the stream ends with a done event");
  return { events, chat: (done as { data: any }).data };
};

test("every method rejects requests without a session", async () => {
  signInAs(null);

  assert.equal((await route.GET(request("GET", "/api/chat"))).status, 401);
  assert.equal((await route.POST(request("POST", "/api/chat", { firstMessage: "hi" }))).status, 401);
  assert.equal((await route.DELETE(request("DELETE", "/api/chat?chatId=1"))).status, 401);
});

test("GET lists only the user's chats, most recently updated first", async () => {
  const old = await db.prisma.chat.create({ data: { userId: "user_1", title: "Old" } });
  await db.prisma.chat.create({ data: { userId: "user_1", title: "Newer" } });
  await db.prisma.chat.create({ data: { userId: "user_2", title: "Someone else's" } });
  await db.prisma.chat.update({ where: { id: old.id }, data: { title: "Old" } });

  const res = await route.GET(request("GET", "/api/chat"));

  assert.deepEqual((await res.json()).map((chat: any) => chat.title), ["Old", "Newer"]);
});

test("POST without a first message creates an empty chat as plain JSON", async () => {
  const res = await route.POST(request("POST", "/api/chat", { title: "Notes" }));

  assert.equal(res.status, 200);
  const chat = await res.json();
  assert.equal(chat.title, "Notes");
  assert.deepEqual(chat.messages, []);
});

test("POST with a first message streams the reply and finishes with the saved chat", async () => {
  stubGemini({ replies: [stream([{ text: "Tokyo " }], [{ text: "is great." }])], title: '"Japan Trip Plan"' });

  const res = await startChat("Plan a trip to Japan");
  const { events, chat } = await doneOf(res);

  assert.equal(res.headers.get("Content-Type"), "application/x-ndjson; charset=utf-8");
  assert.deepEqual(deltasOf(events), ["Tokyo ", "is great."]);
  assert.deepEqual(chat.messages.map((m: any) => [m.role, m.content]), [
    ["user", "Plan a trip to Japan"],
    ["assistant", "Tokyo is great."],
  ]);
  assert.equal(chat.title, "Japan Trip Plan");
  assert.equal(chat.context, "User: Plan a trip to Japan\nAI: Tokyo is great.");
});

test("the assistant is stored as its own user and the signed-in user is created on demand", async () => {
  stubGemini({ replies: [stream([{ text: "Hi." }])] });

  await doneOf(await startChat("hello"));

  assert.equal(db.users.get("user_1")?.email, "user_1@noemail.local");
  assert.equal(db.users.get("luno-ai")?.username, "Luno");
  assert.equal(db.messages.find((m) => m.role === "assistant")?.userId, "luno-ai");
});

test("the title falls back to the start of the message when title generation fails", async () => {
  stubGemini({ replies: [stream([{ text: "Closures capture scope." }])], title: failure(503) });

  const { chat } = await doneOf(await startChat("Explain how closures work in JavaScript please"));

  assert.equal(chat.title, "Explain how closures work in…");
});

test("the chat is saved with a usable title before the reply finishes", async () => {
  stubGemini({ replies: [stream([{ text: "Hi." }])], title: "Greeting" });

  const res = await startChat("hello there");

  assert.equal(db.chats[0].title, "hello there", "the provisional title is in place as soon as the chat exists");
  await readEvents(res);
  assert.equal(db.chats[0].title, "Greeting");
});

test("a searched reply keeps its source list in the message but not in the stored context", async () => {
  stubGemini({ replies: [stream([{ text: "It is sunny." }])] });

  const { chat } = await doneOf(await startChat("What's the news today in Delhi?"));

  const reply = chat.messages.find((m: any) => m.role === "assistant").content;
  assert.match(reply, /\*\*Sources\*\*/);
  assert.equal(chat.context, "User: What's the news today in Delhi?\nAI: It is sunny.");
});

test("when every model is down the user still gets a saved reply and a title", async () => {
  stubGemini({ replies: outage(503), title: "Greeting" });

  const { chat } = await doneOf(await startChat("hello"));

  assert.match(chat.messages.at(-1).content, /overloaded/);
  assert.equal(chat.title, "Greeting");
});

test("DELETE removes the chat and its messages", async () => {
  const chat = await db.prisma.chat.create({
    data: { userId: "user_1", title: "Bye", messages: { create: [{ content: "hi", userId: "user_1", role: "user" }] } },
  });

  const res = await route.DELETE(request("DELETE", `/api/chat?chatId=${chat.id}`));

  assert.deepEqual(await res.json(), { success: true });
  assert.equal(db.chats.length, 0);
  assert.equal(db.messages.length, 0);
});

test("DELETE does not touch another user's chat", async () => {
  const chat = await db.prisma.chat.create({
    data: { userId: "user_2", title: "Theirs", messages: { create: [{ content: "hi", userId: "user_2", role: "user" }] } },
  });

  const res = await route.DELETE(request("DELETE", `/api/chat?chatId=${chat.id}`));

  assert.equal(res.status, 404);
  assert.equal(db.chats.length, 1);
  assert.equal(db.messages.length, 1);
});

test("DELETE of an unknown chat is a 404", async () => {
  assert.equal((await route.DELETE(request("DELETE", "/api/chat?chatId=999"))).status, 404);
});

test("POST can start a chat with only a file, and names it after the file", async () => {
  const api = stubGemini({ replies: [stream([{ text: "A cat." }])], title: "Cat Photo" });

  const res = await route.POST(request("POST", "/api/chat", { firstMessage: "", attachments: [{ name: "cat.png", mimeType: "image/png", data: "AAAA" }] }));
  const { chat } = await doneOf(res);

  assert.equal(chat.title, "Cat Photo");
  assert.deepEqual(chat.messages[0].attachments, [{ name: "cat.png", mimeType: "image/png" }]);
  assert.equal(api.titleCalls()[0].body.contents[0].parts[0].text, "cat.png");
  assert.equal(api.chatCalls()[0].body.contents[0].parts[0].inlineData.data, "AAAA");
});

test("POST refuses attachments that are not allowed, before creating a chat", async () => {
  const res = await route.POST(request("POST", "/api/chat", { firstMessage: "hi", attachments: [{ name: "a.zip", mimeType: "application/zip", data: "AAAA" }] }));

  assert.equal(res.status, 400);
  assert.equal(db.chats.length, 0);
});
