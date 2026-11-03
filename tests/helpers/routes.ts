import { mock } from "node:test";
import { NextRequest } from "next/server";
import { readNdjson, type StreamEvent } from "../../src/lib/http/ndjson";
import { createFakeDb } from "./db";

/**
 * Replaces Clerk and the Prisma client with fakes. Call it at the top of a route test file, before importing the route:
 * module mocks only affect modules loaded afterwards.
 */
export function mockServerDeps() {
  const db = createFakeDb();
  const session = { userId: null as string | null };
  mock.module("@clerk/nextjs/server", { exports: { getAuth: () => ({ userId: session.userId }) } });
  mock.module("../../src/lib/db/prisma", { exports: { default: db.prisma } });
  return {
    db,
    /** Signs requests in as this user, or signs out with `null`. */
    signInAs: (userId: string | null) => {
      session.userId = userId;
    },
  };
}

export function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost"), {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Reads every event of a streamed response. */
export async function readEvents(res: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  await readNdjson(res, (event) => events.push(event));
  return events;
}

/** Text of every `delta` event, in order. */
export const deltasOf = (events: StreamEvent[]) => events.flatMap((e) => (e.type === "delta" ? [e.text] : []));
