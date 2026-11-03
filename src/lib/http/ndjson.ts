export type StreamEvent =
  | { type: "status"; text: string }
  | { type: "delta"; text: string }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string };

/** Streams `run`'s events to the client as newline-delimited JSON, one event per line. */
export function ndjsonResponse(run: (send: (event: StreamEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The client disconnected; keep running so the reply is still saved.
        }
      };
      try {
        await run(send);
      } catch (error) {
        console.error("Stream failed:", error);
        send({ type: "error", message: "Something went wrong. Please try again." });
      }
      try {
        controller.close();
      } catch {
        // Already closed by a cancelled client.
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Reads a response made by `ndjsonResponse`, calling `onEvent` for each line as soon as it arrives. */
export async function readNdjson(res: Response, onEvent: (event: StreamEvent) => void): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer));
}
