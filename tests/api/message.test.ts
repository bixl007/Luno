import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { failure, outage, restoreGemini, stream, stubGemini } from "../helpers/gemini";
import { deltasOf, mockServerDeps, readEvents, request } from "../helpers/routes";

const { db, signInAs } = mockServerDeps();
let route: typeof import("@/app/api/message/route");

before(async () => {
  route = await import("@/app/api/message/route");
});
beforeEach(() => {
  db.reset();
  signInAs("user_1");
});
afterEach(restoreGemini);

const makeChat = (context: string | null = null) =>
  db.prisma.chat.create({ data: { userId: "user_1", title: "Test", context } });
const send = (chatId: number, content: string) => route.POST(request("POST", "/api/message", { chatId, content }));
const doneOf = async (res: Response) => {
  const events = await readEvents(res);
  const done = events.at(-1);
  assert.equal(done?.type, "done", "the stream ends with a done event");
  return { events, data: (done as { data: any }).data };
};

test("GET needs a session and a chat id", async () => {
  const chat = await makeChat();
  signInAs(null);
  assert.equal((await route.GET(request("GET", `/api/message?chatId=${chat.id}`))).status, 401);
  signInAs("user_1");
  assert.equal((await route.GET(request("GET", "/api/message"))).status, 401);
  assert.equal((await route.GET(request("GET", `/api/message?chatId=${chat.id}`))).status, 200);
});

test("GET and POST refuse a chat that belongs to someone else", async () => {
  const theirs = await db.prisma.chat.create({ data: { userId: "user_2", title: "Theirs" } });
  await db.prisma.message.create({ data: { chatId: theirs.id, userId: "user_2", role: "user", content: "secret" } });

  assert.equal((await route.GET(request("GET", `/api/message?chatId=${theirs.id}`))).status, 404);
  assert.equal((await send(theirs.id, "hi")).status, 404);
  assert.equal(db.messages.length, 1, "nothing is added to their chat");
});

test("GET returns a chat's messages oldest first", async () => {
  const chat = await makeChat();
  for (const [role, content] of [["user", "first"], ["assistant", "second"], ["user", "third"]]) {
    await db.prisma.message.create({ data: { chatId: chat.id, userId: "user_1", role, content } });
  }

  const res = await route.GET(request("GET", `/api/message?chatId=${chat.id}`));

  assert.deepEqual((await res.json()).map((m: any) => m.content), ["first", "second", "third"]);
});

test("POST rejects a missing session, missing fields and unknown chats with plain JSON errors", async () => {
  const chat = await makeChat();

  signInAs(null);
  assert.equal((await send(chat.id, "hi")).status, 401);
  signInAs("user_1");
  assert.equal((await route.POST(request("POST", "/api/message", { content: "hi" }))).status, 400);
  assert.equal((await route.POST(request("POST", "/api/message", { chatId: chat.id }))).status, 400);
  assert.equal((await send(999, "hi")).status, 404);
  assert.equal(db.messages.length, 0, "nothing is stored for rejected requests");
});

test("POST streams the reply and finishes with both saved messages", async () => {
  stubGemini({ replies: [stream([{ text: "Hel" }], [{ text: "lo!" }])] });
  const chat = await makeChat();

  const res = await send(chat.id, "hi");
  const { events, data } = await doneOf(res);

  assert.equal(res.headers.get("Content-Type"), "application/x-ndjson; charset=utf-8");
  assert.deepEqual(deltasOf(events), ["Hel", "lo!"]);
  assert.deepEqual([data.user.role, data.user.content], ["user", "hi"]);
  assert.deepEqual([data.assistant.role, data.assistant.content, data.assistant.userId], ["assistant", "Hello!", "luno-ai"]);
  assert.deepEqual(db.messages.map((m) => m.content), ["hi", "Hello!"]);
});

test("the stored history is sent to the model and extended with the new exchange", async () => {
  const api = stubGemini({ replies: [stream([{ text: "Python too." }])] });
  const chat = await makeChat("User: closures?\nAI: They capture scope.");

  await doneOf(await send(chat.id, "and Python?"));

  assert.match(api.chatCalls()[0].body.contents[0].parts[0].text, /User: closures\?\nAI: They capture scope\./);
  assert.equal(db.chats[0].context, "User: closures?\nAI: They capture scope.\nUser: and Python?\nAI: Python too.");
});

test("sending a message moves the chat to the top of the list", async () => {
  stubGemini({ replies: [stream([{ text: "ok" }])] });
  const first = await makeChat();
  await makeChat();

  await doneOf(await send(first.id, "hi"));

  const titles = await db.prisma.chat.findMany({ where: { userId: "user_1" }, orderBy: { updatedAt: "desc" } });
  assert.equal(titles[0].id, first.id);
});

test("a searched reply keeps its source list in the message but not in the stored context", async () => {
  stubGemini({ replies: [stream([{ text: "Rain expected." }])] });
  const chat = await makeChat();

  const { data } = await doneOf(await send(chat.id, "news today in Mumbai?"));

  assert.match(data.assistant.content, /Rain expected\.\n\n---\n\*\*Sources\*\*/);
  assert.equal(db.chats[0].context, "\nUser: news today in Mumbai?\nAI: Rain expected.");
});

test("an outage never becomes an HTTP error: the user still gets a saved reply", async () => {
  stubGemini({ replies: outage(503) });
  const chat = await makeChat();

  const res = await send(chat.id, "hi");
  const { data } = await doneOf(res);

  assert.equal(res.status, 200);
  assert.match(data.assistant.content, /overloaded/);
});

test("the first model's overload is invisible to the user", async () => {
  const api = stubGemini({ replies: [failure(503), stream([{ text: "From the backup." }])] });
  const chat = await makeChat();

  const { data } = await doneOf(await send(chat.id, "hi"));

  assert.equal(data.assistant.content, "From the backup.");
  assert.equal(api.chatCalls().length, 2);
});

const png = { name: "cat.png", mimeType: "image/png", data: "AAAA" };
const sendWith = (chatId: number, body: object) => route.POST(request("POST", "/api/message", { chatId, ...body }));

test("POST sends attached files to the model and keeps only their names", async () => {
  const api = stubGemini({ replies: [stream([{ text: "A cat." }])] });
  const chat = await makeChat();

  const { data } = await doneOf(await sendWith(chat.id, { content: "what is this?", attachments: [png] }));

  assert.deepEqual(api.chatCalls()[0].body.contents[0].parts[0], { inlineData: { mimeType: "image/png", data: "AAAA" } });
  assert.deepEqual(data.user.attachments, [{ name: "cat.png", mimeType: "image/png" }]);
  assert.ok(!JSON.stringify(db.messages).includes("AAAA"), "the file itself is never stored");
  assert.match(db.chats[0].context, /User: what is this\?\n\(Attached: cat\.png\)\nAI: A cat\./);
});

test("POST accepts files without any text", async () => {
  stubGemini({ replies: [stream([{ text: "It is a cat." }])] });
  const chat = await makeChat();

  const res = await sendWith(chat.id, { content: "", attachments: [png] });

  assert.equal(res.status, 200);
  assert.equal((await doneOf(res)).data.assistant.content, "It is a cat.");
});

test("POST refuses bad attachments before anything is stored or sent", async () => {
  const api = stubGemini();
  const chat = await makeChat();

  for (const attachments of ["x", [{ ...png, mimeType: "application/zip" }], [{ ...png, data: "***" }], Array(5).fill(png)]) {
    const res = await sendWith(chat.id, { content: "hi", attachments });
    assert.equal(res.status, 400);
    assert.ok(typeof (await res.json()).error === "string");
  }
  assert.equal(db.messages.length, 0);
  assert.equal(api.chatCalls().length, 0);
});

test("POST uses the saved preferences and the picked model", async () => {
  const api = stubGemini({ replies: [stream([{ text: "Hi." }])] });
  const chat = await makeChat();
  await db.prisma.user.create({ data: { id: "user_1", email: "u@x", preferences: { nickname: "Bix", style: "concise" } } });
  const picked = (await import("@/lib/ai/gemini")).GEMINI_MODELS.at(-1)!;

  await doneOf(await sendWith(chat.id, { content: "hello", model: picked }));

  assert.equal(api.chatCalls()[0].model, picked);
  assert.match(api.chatCalls()[0].body.systemInstruction.parts[0].text, /Call the user "Bix"/);
});
