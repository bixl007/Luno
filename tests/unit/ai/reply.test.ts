import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { generateGeminiResponse, withoutSources } from "@/lib/ai/reply";
import type { StreamEvent } from "@/lib/http/ndjson";
import { GEMINI_MODELS } from "@/lib/ai/gemini";
import { failure, compatStream, compatToolStream, hang, outage, searchCall, sseEvent, stream, stubGemini } from "../../helpers/gemini";
import type { ReplyOptions } from "@/lib/ai/reply";

async function reply(prompt: string, context: string | null = null, options?: ReplyOptions) {
  const events: StreamEvent[] = [];
  const text = await generateGeminiResponse(prompt, context, (event) => events.push(event), options);
  return { text, events, deltas: events.flatMap((e) => (e.type === "delta" ? [e.text] : [])) };
}

afterEach(() => mock.restoreAll());

test("search round trip echoes the model turn, answers the call and appends sources", async () => {
  const api = stubGemini({
    replies: [
      stream([{ ...searchCall("gemini models"), thoughtSignature: "SIG" }]),
      stream([{ text: "It's " }], [{ text: "3.8 Flash." }]),
    ],
  });

  const { text, deltas } = await reply("tell me about gemini models");

  assert.match(text, /^It's 3\.8 Flash\./);
  assert.match(text, /\*\*Sources\*\*\n- \[a\.com\]\(https:\/\/a\.com\/x\)/);
  assert.deepEqual(deltas.slice(0, 2), ["It's ", "3.8 Flash."]);
  const followUp = api.chatCalls()[1].body.contents;
  assert.equal(followUp[1].role, "model");
  assert.equal(followUp[1].parts[0].thoughtSignature, "SIG");
  assert.equal(followUp[2].parts[0].functionResponse.name, "web_search");
});

test("only the first two searches in a round run, all calls still get a response", async () => {
  const api = stubGemini({
    replies: [stream([searchCall("a"), searchCall("b"), searchCall("c")]), stream([{ text: "Done." }])],
  });

  await reply("compare things");

  assert.equal(api.searchCalls().length, 2);
  assert.equal(api.chatCalls()[1].body.contents[2].parts.length, 3);
});

test("malformed tool calls get an error response instead of a search", async () => {
  const api = stubGemini({
    replies: [stream([{ functionCall: { name: "web_search", args: {} } }]), stream([{ text: "Fine." }])],
  });

  await reply("anything");

  assert.equal(api.searchCalls().length, 0);
  assert.equal(api.chatCalls()[1].body.contents[2].parts[0].functionResponse.response.error, "Invalid tool call.");
});

test("empty model text after a search gives the fallback, not a bare source list", async () => {
  stubGemini({ replies: [stream([searchCall("q")]), stream([{ text: "" }])] });

  const { text } = await reply("anything");

  assert.doesNotMatch(text, /Sources/);
  assert.match(text, /technical problem/);
});

test("withoutSources strips the appended list", async () => {
  stubGemini({ replies: [stream([searchCall("q")]), stream([{ text: "Answer." }])] });

  const { text } = await reply("q");

  assert.equal(withoutSources(text), "Answer.");
  assert.equal(withoutSources("No sources here."), "No sources here.");
});

test("events split across network chunks are reassembled", async () => {
  stubGemini({
    replies: [
      {
        data: Readable.from([
          'data: {"candidates":[{"content":{"parts":[{"te',
          'xt":"Hel"}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"lo"}]}}]}\r\n',
          "\r\n",
        ]),
      },
    ],
  });

  const { text, deltas } = await reply("say hello");

  assert.deepEqual(deltas, ["Hel", "lo"]);
  assert.equal(text, "Hello");
});

test("thought parts are echoed to the model but never shown to the user", async () => {
  stubGemini({ replies: [stream([{ text: "private reasoning", thought: true }, { text: "Visible." }])] });

  const { text, deltas } = await reply("hi");

  assert.equal(text, "Visible.");
  assert.deepEqual(deltas, ["Visible."]);
});

test("an overloaded model fails over to the next one", async () => {
  const api = stubGemini({ replies: [failure(503), stream([{ text: "Hi from the backup." }])] });

  const { text } = await reply("hello");

  assert.equal(text, "Hi from the backup.");
  assert.deepEqual(api.chatCalls().map((c) => c.model), ["gemini-3.8-flash", "gemini-3.6-flash"]);
});

test("a rate-limited model also fails over", async () => {
  const api = stubGemini({ replies: [failure(429), stream([{ text: "ok" }])] });

  await reply("hello");

  assert.equal(api.chatCalls().length, 2);
});

test("a client error does not fail over", async () => {
  const api = stubGemini({ replies: [failure(403)] });

  const { text } = await reply("hello");

  assert.equal(api.chatCalls().length, 1);
  assert.match(text, /technical problem/);
});

test("a bad request is retried once with a minimal request", async () => {
  const api = stubGemini({ replies: [failure(400), stream([{ text: "Recovered." }])] });

  const { text } = await reply("hello", "User: earlier\nAI: reply");

  assert.equal(text, "Recovered.");
  const retry = api.chatCalls()[1].body;
  assert.equal(retry.contents[0].parts[0].text, "hello");
  assert.equal(retry.tools, undefined);
  assert.equal(retry.generationConfig, undefined);
});

test("a retired model (404) is skipped instead of ending the conversation", async () => {
  const api = stubGemini({ replies: [failure(404), stream([{ text: "Still here." }])] });

  const { text } = await reply("hello");

  assert.equal(text, "Still here.");
  assert.deepEqual(api.chatCalls().map((c) => c.model), GEMINI_MODELS.slice(0, 2));
});

test("every model overloaded gives the overloaded message", async () => {
  stubGemini({ replies: outage(503) });

  const { text } = await reply("hello");

  assert.match(text, /overloaded/);
});

test("every model rate limited gives the rate limit message", async () => {
  stubGemini({ replies: outage(429) });

  const { text } = await reply("hello");

  assert.match(text, /rate limit/);
});

test("the fallback message mentions the creator when the user asked about them", async () => {
  stubGemini({ replies: outage(500) });

  const { text } = await reply("who made you?");

  assert.match(text, /Bishal Baira/);
});

test("time-sensitive prompts are searched first and the results go to the model", async () => {
  const api = stubGemini({ replies: [stream([{ text: "It is sunny." }])] });

  const { text, events } = await reply("what's the news today in Delhi?");

  assert.equal(api.searchCalls().length, 1);
  assert.equal(api.chatCalls().length, 1);
  const sent = api.chatCalls()[0].body;
  assert.match(sent.contents[0].parts[0].text, /Live web search results[\s\S]*Fresh facts\./);
  assert.ok(sent.tools, "the model can still search for more");
  assert.deepEqual(events[0], { type: "status", text: "Searching the web…" });
  assert.match(text, /\*\*Sources\*\*/);
});

test("prompts that do not need fresh data are not searched", async () => {
  const api = stubGemini({ replies: [stream([{ text: "A closure is..." }])] });

  const { text } = await reply("explain closures in JavaScript");

  assert.equal(api.searchCalls().length, 0);
  assert.doesNotMatch(text, /Sources/);
});

test("conversation history is sent with the new message", async () => {
  const api = stubGemini({ replies: [stream([{ text: "Sure." }])] });

  await reply("and what about Python?", "User: explain closures\nAI: A closure is...");

  const sent = api.chatCalls()[0].body.contents[0].parts[0].text;
  assert.match(sent, /Conversation so far:\nUser: explain closures/);
  assert.match(sent, /New message from the user:\nand what about Python\?/);
});

test("a failure after a search answers from the gathered results on any model", async () => {
  const api = stubGemini({ replies: [stream([searchCall("q")]), failure(503), stream([{ text: "From the notes." }])] });

  const { text } = await reply("tell me something");

  assert.match(text, /^From the notes\./);
  const retry = api.chatCalls()[2].body;
  assert.equal(retry.tools, undefined);
  assert.match(retry.contents[0].parts[0].text, /Fresh facts\./);
  assert.equal(retry.contents.length, 1);
});

test("a stream that breaks after text keeps the text instead of an error", async () => {
  const broken = new Readable({ read() {} });
  broken.push(sseEvent([{ text: "Part of an answer" }]));
  setImmediate(() => broken.destroy(new Error("aborted")));
  stubGemini({ replies: [{ data: broken }] });

  const { text } = await reply("hello");

  assert.match(text, /^Part of an answer\n\n_The response was interrupted/);
});

test("a model that stays silent is overtaken by the next one, which starts alongside it", async () => {
  const api = stubGemini({ replies: [hang(), stream([{ text: "Quick answer." }])] });

  const { text } = await reply("hello");

  assert.equal(text, "Quick answer.");
  const [slow, fast] = api.chatCalls();
  assert.deepEqual([slow.model, fast.model], GEMINI_MODELS.slice(0, 2));
  assert.equal(slow.signal?.aborted, true, "the silent request is cancelled once another model answers");
});

test("a model that answers in time is never hedged", async () => {
  const api = stubGemini({ replies: [stream([{ text: "Fine." }])] });

  await reply("hello");
  await new Promise((resolve) => setTimeout(resolve, 120)); // longer than the hedge delay

  assert.equal(api.chatCalls().length, 1);
});

test("only the model that answers first is heard", async () => {
  stubGemini({
    replies: [
      (config: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          config.signal?.addEventListener("abort", () => reject(Object.assign(new Error("canceled"), { code: "ERR_CANCELED" })));
          setTimeout(() => resolve(stream([{ text: "slow model " }, { text: "words" }])), 300);
        }),
      stream([{ text: "Fast model." }]),
    ],
  });

  const { text, deltas } = await reply("hello");

  assert.equal(text, "Fast model.");
  assert.deepEqual(deltas, ["Fast model."]);
});

test("a model that failed is skipped on the next reply instead of being waited on again", async () => {
  const api = stubGemini({ replies: [failure(503), stream([{ text: "One." }]), stream([{ text: "Two." }])] });

  await reply("first question");
  await reply("second question");

  assert.deepEqual(api.chatCalls().map((c) => c.model), [GEMINI_MODELS[0], GEMINI_MODELS[1], GEMINI_MODELS[1]]);
});

test("a model that was too slow is skipped on the next reply", async () => {
  const api = stubGemini({ replies: [hang(), stream([{ text: "One." }]), stream([{ text: "Two." }])] });

  await reply("first question");
  await reply("second question");

  assert.deepEqual(api.chatCalls().map((c) => c.model), [GEMINI_MODELS[0], GEMINI_MODELS[1], GEMINI_MODELS[1]]);
});

test("a retired model is remembered as gone and not retried", async () => {
  const api = stubGemini({ replies: [failure(404), stream([{ text: "One." }]), stream([{ text: "Two." }])] });

  await reply("first question");
  await reply("second question");

  assert.equal(api.chatCalls().filter((c) => c.model === GEMINI_MODELS[0]).length, 1);
});

test("when every model is cooling down they are all still tried", async () => {
  stubGemini({ replies: outage(503) });
  await reply("first question"); // marks the whole chain unhealthy

  const api = stubGemini({ replies: [stream([{ text: "Back." }])] });
  const { text } = await reply("second question");

  assert.equal(text, "Back.");
  assert.equal(api.chatCalls().length, 1);
});

test("an error after the winner started answering is final: no other model is tried", async () => {
  const broken = new Readable({ read() {} });
  broken.push(sseEvent([{ text: "Half" }]));
  setImmediate(() => broken.destroy(new Error("aborted")));
  const api = stubGemini({ replies: [{ data: broken }, stream([{ text: "Should never be used." }])] });

  const { text } = await reply("hello");

  assert.match(text, /^Half\n\n_The response was interrupted/);
  assert.equal(api.chatCalls().length, 1);
});

test("a model that wins but answered slowly is demoted behind faster ones for the next reply", async () => {
  const slowButFine = () =>
    new Promise((resolve) => setTimeout(() => resolve(stream([{ text: "Eventually." }])), 120)); // slower than the hedge delay
  const api = stubGemini({ replies: [slowButFine, stream([{ text: "Fast." }])] });

  await reply("first question");
  await reply("second question");

  const models = api.chatCalls().map((c) => c.model);
  assert.equal(models[0], GEMINI_MODELS[0]);
  assert.notEqual(models.at(-1), GEMINI_MODELS[0], "the slow model is no longer first in line");
});

test("a model that breaks while answering is not used first on the next reply", async () => {
  const broken = new Readable({ read() {} });
  broken.push(sseEvent([{ text: "Half" }]));
  setImmediate(() => broken.destroy(new Error("aborted")));
  const api = stubGemini({ replies: [{ data: broken }, stream([{ text: "Whole answer." }])] });

  await reply("first question");
  await reply("second question");

  assert.equal(api.chatCalls().at(-1)?.model, GEMINI_MODELS[1]);
});

const photo = { name: "a.png", mimeType: "image/png", data: "AAAA" };
const pdf = { name: "b.pdf", mimeType: "application/pdf", data: "BBBB" };

test("attached files are sent to Gemini before the text", async () => {
  const api = stubGemini({ replies: [stream([{ text: "A cat." }])] });

  await reply("what is this?", null, { attachments: [photo] });

  const parts = api.chatCalls()[0].body.contents[0].parts;
  assert.deepEqual(parts[0], { inlineData: { mimeType: "image/png", data: "AAAA" } });
  assert.equal(parts[1].text, "what is this?");
});

test("a picked Gemini model is the only one tried", async () => {
  const api = stubGemini({ replies: [failure(503)] });
  const picked = GEMINI_MODELS[GEMINI_MODELS.length - 1];

  const { text } = await reply("hi", null, { model: picked });

  assert.deepEqual(api.chatCalls().map((c) => c.model), [picked]);
  assert.match(text, /overloaded/);
});

test("the preferences reach the system instruction", async () => {
  const api = stubGemini({ replies: [stream([{ text: "Hi Bix." }])] });

  await reply("hi", null, { preferences: { nickname: "Bix", occupation: "", about: "", instructions: "", style: "default", accent: "indigo", companion: true } });

  assert.match(api.chatCalls()[0].body.systemInstruction.parts[0].text, /Call the user "Bix"/);
});

test("the Groq model streams its answer and sees images as data URLs", async () => {
  process.env.GROQ_API_KEY = "test";
  const api = stubGemini({ compatReplies: [compatStream("A ", "cat.")] });

  const { text, deltas } = await reply("what is this?", null, { model: "qwen/qwen3.8-27b", attachments: [photo] });

  delete process.env.GROQ_API_KEY;
  assert.equal(text, "A cat.");
  assert.deepEqual(deltas, ["A ", "cat."]);
  assert.equal(api.chatCalls().length, 0, "Gemini is not used");
  const content = api.compatCalls()[0].body.messages![1].content;
  assert.equal(content[1].image_url.url, "data:image/png;base64,AAAA");
  assert.ok(api.compatCalls()[0].body.messages![0].content.includes("web_search"), "the model is told it has the search tool");
});

test("Groq is skipped for a PDF, which only Gemini can read", async () => {
  process.env.GROQ_API_KEY = "test";
  const api = stubGemini({ replies: [stream([{ text: "Read it." }])] });

  const { text, events } = await reply("summarise", null, { model: "qwen/qwen3.8-27b", attachments: [pdf] });

  delete process.env.GROQ_API_KEY;
  assert.equal(text, "Read it.");
  assert.equal(api.compatCalls().length, 0);
  assert.ok(events.some((e) => e.type === "status" && /Gemini/.test(e.text)));
});

test("when Groq fails before answering, Gemini takes over", async () => {
  process.env.GROQ_API_KEY = "test";
  const api = stubGemini({ compatReplies: [failure(429)], replies: [stream([{ text: "From Gemini." }])] });

  const { text } = await reply("hi", null, { model: "qwen/qwen3.8-27b" });

  delete process.env.GROQ_API_KEY;
  assert.equal(text, "From Gemini.");
  assert.equal(api.compatCalls().length, 1);
  assert.equal(api.chatCalls().length, 1);
});

test("OpenRouter requests go to its own API with its own key and title", async () => {
  process.env.OPENROUTER_API_KEY = "ok";
  const api = stubGemini({ compatReplies: [compatStream("Router says hi.")] });

  const { text } = await reply("hi", null, { model: "openrouter/free" });

  delete process.env.OPENROUTER_API_KEY;
  assert.equal(text, "Router says hi.");
  const [call] = api.compatCalls();
  assert.equal(call.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(call.headers!.Authorization, "Bearer ok");
  assert.equal(call.headers!["X-Title"], "Luno");
  assert.equal(api.chatCalls().length, 0);
});

test("a reply about a file waits longer for the model than a plain one", async () => {
  const api = stubGemini({ replies: [stream([{ text: "A." }]), stream([{ text: "B." }])] });

  await reply("hi");
  await reply("what is this?", null, { attachments: [photo] });

  const [plain, withFile] = api.chatCalls();
  assert.ok(withFile.timeout! > plain.timeout!, `${withFile.timeout} should be above ${plain.timeout}`);
});

test("when every model times out the user is told so and can pick another model", async () => {
  const timeout = () => Object.assign(new Error("timeout of 15000ms exceeded"), { code: "ECONNABORTED" });
  stubGemini({ replies: GEMINI_MODELS.map(timeout) });

  const { text } = await reply("hi");

  assert.match(text, /took too long/);
  assert.match(text, /different model/);
});

test("Auto tries the fast provider first when its key is set, and never touches Gemini if it answers", async () => {
  process.env.GROQ_API_KEY = "g";
  const api = stubGemini({ compatReplies: [compatStream("Quick.")] });

  const { text } = await reply("hi");

  delete process.env.GROQ_API_KEY;
  assert.equal(text, "Quick.");
  assert.equal(api.compatCalls().length, 1);
  assert.equal(api.chatCalls().length, 0);
});

test("Auto falls back to Gemini when the fast provider fails, and AUTO_PREFER_GEMINI skips it", async () => {
  process.env.GROQ_API_KEY = "g";
  const api = stubGemini({ compatReplies: [failure(404)], replies: [stream([{ text: "From Gemini." }]), stream([{ text: "Gemini first." }])] });

  assert.equal((await reply("hi")).text, "From Gemini.");
  assert.equal(api.compatCalls().length, 1);

  process.env.AUTO_PREFER_GEMINI = "1";
  assert.equal((await reply("hi again")).text, "Gemini first.");
  delete process.env.AUTO_PREFER_GEMINI;
  delete process.env.GROQ_API_KEY;
  assert.equal(api.compatCalls().length, 1, "no second Groq call when Gemini is preferred");
});

test("a fast-provider model can search: the tool call is run, answered, and the sources are appended", async () => {
  process.env.GROQ_API_KEY = "g";
  const api = stubGemini({ compatReplies: [compatToolStream("india cricket schedule"), compatStream("India play ", "Australia next.")] });

  const { text } = await reply("What matches does India play next?");

  delete process.env.GROQ_API_KEY;
  assert.match(text, /^India play Australia next\./);
  assert.match(text, /\*\*Sources\*\*\n- \[a\.com\]/);
  assert.equal(api.searchCalls().length, 1);
  assert.equal(api.chatCalls().length, 0, "Gemini only searched; it did not answer");
  const [first, second] = api.compatCalls();
  assert.ok(first.body.tools, "the first call offers the tool");
  const turn = second.body.messages!;
  assert.equal(turn[2].role, "assistant");
  assert.deepEqual(turn[2].tool_calls![0].function, { name: "web_search", arguments: '{"query":"india cricket schedule"}' });
  assert.equal(turn[3].role, "tool");
  assert.equal(turn[3].tool_call_id, "call_1");
  assert.match(turn[3].content, /Fresh facts\./);
});

test("a malformed tool call from a fast-provider model gets an error response, not a search", async () => {
  process.env.GROQ_API_KEY = "g";
  const api = stubGemini({ compatReplies: [compatToolStream(""), compatStream("Fine.")] });

  const { text } = await reply("hello there");

  delete process.env.GROQ_API_KEY;
  assert.equal(text, "Fine.");
  assert.equal(api.searchCalls().length, 0);
  assert.match(api.compatCalls()[1].body.messages![3].content, /Invalid tool call/);
});

const METEO = {
  geo: { results: [{ name: "Bengaluru", admin1: "Karnataka", country: "India", timezone: "Asia/Kolkata", latitude: 12.97, longitude: 77.59, population: 8_000_000 }] },
  forecast: { current: { time: "2026-11-03T23:15", temperature_2m: 21.2, apparent_temperature: 24.2, relative_humidity_2m: 92, precipitation: 0, weather_code: 1, wind_speed_10m: 5.2 } },
};
const placeCall = (place: string) => ({ functionCall: { name: "place_conditions", args: { place } } });

test("a Gemini reply can ask for a place's time and weather, and the live numbers go back to the model", async () => {
  const api = stubGemini({ meteo: METEO, replies: [stream([placeCall("Bengaluru, India")]), stream([{ text: "21.2°C." }])] });

  const { text } = await reply("what is the weather in bengaluru?");

  assert.match(text, /^21\.2°C\./);
  assert.match(text, /\[Open-Meteo weather and local time\]\(https:\/\/open-meteo\.com\/\)/, "the data source is credited");
  const answer = api.chatCalls()[1].body.contents[2].parts[0].functionResponse;
  assert.equal(answer.name, "place_conditions");
  assert.equal(answer.response.weather, "mainly clear, 21.2°C (feels like 24.2°C), humidity 92%, wind 5.2 km/h");
  assert.equal(api.searchCalls().length, 0, "no web search for a weather question");
  assert.equal(api.bingCalls().length + api.ddgCalls().length, 0, "the raw question is not searched either");
});

test("a fast-provider model can call place_conditions too, and a failed lookup is reported, not guessed", async () => {
  process.env.GROQ_API_KEY = "g";
  const toolCall = (args: object) => ({
    data: Readable.from([
      `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "place_conditions", arguments: JSON.stringify(args) } }] } }] })}\n\n`,
      "data: [DONE]\n\n",
    ]),
  });
  const api = stubGemini({ compatReplies: [toolCall({ place: "Atlantis" }), compatStream("I couldn't look that up.")] });

  const { text } = await reply("what time is it in atlantis?");

  delete process.env.GROQ_API_KEY;
  assert.match(text, /^I couldn't look that up\./);
  assert.ok((api.compatCalls()[0].body.tools as any[]).some((t) => t.function.name === "place_conditions"));
  assert.match(api.compatCalls()[1].body.messages![3].content, /Could not find that place/);
  assert.ok(!text.includes("open-meteo"), "no credit when nothing was used");
});
