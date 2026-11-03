import { test } from "node:test";
import assert from "node:assert/strict";
import { ndjsonResponse, readNdjson, type StreamEvent } from "@/lib/http/ndjson";

async function collect(res: Response) {
  const events: StreamEvent[] = [];
  await readNdjson(res, (event) => events.push(event));
  return events;
}

test("events written by the server are read back in order", async () => {
  const res = ndjsonResponse(async (send) => {
    send({ type: "status", text: "Searching" });
    send({ type: "delta", text: "Hel" });
    send({ type: "delta", text: "lo\nthere" });
    send({ type: "done", data: { id: 1 } });
  });

  assert.equal(res.headers.get("Content-Type"), "application/x-ndjson; charset=utf-8");
  assert.deepEqual(await collect(res), [
    { type: "status", text: "Searching" },
    { type: "delta", text: "Hel" },
    { type: "delta", text: "lo\nthere" },
    { type: "done", data: { id: 1 } },
  ]);
});

test("a failure inside the run becomes an error event instead of a broken stream", async () => {
  const res = ndjsonResponse(async (send) => {
    send({ type: "delta", text: "partial" });
    throw new Error("db down");
  });

  const events = await collect(res);

  assert.deepEqual(events[0], { type: "delta", text: "partial" });
  assert.equal(events.at(-1)?.type, "error");
});
