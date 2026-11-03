import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ATTACHMENTS, isVisionReadable, kindOf, mimeTypeOf, parseAttachments } from "@/lib/attachments";

const b64 = (text: string) => Buffer.from(text).toString("base64");
const file = (name = "a.txt", mimeType = "text/plain", data = b64("hello")) => ({ name, mimeType, data });

test("images, PDFs and text are readable; other types are not", () => {
  assert.equal(kindOf("image/png"), "image");
  assert.equal(kindOf("image/heic"), "image");
  assert.equal(kindOf("application/pdf"), "pdf");
  assert.equal(kindOf("text/markdown"), "text");
  assert.equal(kindOf("application/json"), "text");
  assert.equal(kindOf("application/zip"), null);
  assert.equal(kindOf("image/gif"), null);
});

test("a file the browser could not type is read as text by its extension", () => {
  assert.equal(mimeTypeOf({ name: "main.ts", type: "" }), "text/plain");
  assert.equal(mimeTypeOf({ name: "photo.png", type: "image/png" }), "image/png");
  assert.equal(mimeTypeOf({ name: "archive.bin", type: "" }), "");
});

test("only PNG, JPEG, WebP and text go to the Groq model", () => {
  assert.equal(isVisionReadable({ mimeType: "image/jpeg" }), true);
  assert.equal(isVisionReadable({ mimeType: "text/plain" }), true);
  assert.equal(isVisionReadable({ mimeType: "application/pdf" }), false);
  assert.equal(isVisionReadable({ mimeType: "image/heic" }), false);
});

test("no attachments is fine, and valid ones come back cleaned", () => {
  assert.deepEqual(parseAttachments(undefined), { attachments: [] });
  assert.deepEqual(parseAttachments(null), { attachments: [] });
  assert.deepEqual(parseAttachments([file("  notes.txt  ")]), { attachments: [file("notes.txt")] });
});

test("bad input is refused with a reason", () => {
  const error = (input: unknown) => (parseAttachments(input) as { error: string }).error;

  assert.match(error("nope"), /list/);
  assert.match(error(Array(MAX_ATTACHMENTS + 1).fill(file())), /up to 4/);
  assert.match(error([{ name: "a.txt" }]), /malformed/);
  assert.match(error([file("a.txt", "")]), /not a supported/);
  assert.match(error([file("a.zip", "application/zip")]), /not a supported/);
  assert.match(error([file("a.txt", "text/plain", "not base64!!")]), /could not be read/);
});

test("the size limit counts every file together", () => {
  const big = file("a.pdf", "application/pdf", Buffer.alloc(1_600_000).toString("base64"));

  assert.ok("attachments" in parseAttachments([big]));
  assert.match((parseAttachments([big, { ...big, name: "b.pdf" }]) as { error: string }).error, /too large/);
});
