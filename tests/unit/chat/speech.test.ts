import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkForSpeech, cleanForSpeech, pickVoice } from "@/components/chat/speech";

test("markdown, links, emoji and the sources list are not read aloud", () => {
  const text = "## Title\n\n**Bold** and `code` with [a link](https://x.com) 😀\n\n- one\n- two\n\n```js\nconst a = 1;\n```\n\n---\n**Sources**\n- [x](https://x.com)";

  assert.equal(cleanForSpeech(text), "Title. Bold and code with a link. one. two. Code block.");
});

test("table dividers are dropped and cell bars become pauses", () => {
  const spoken = cleanForSpeech("| a | b |\n|---|---|\n| 1 | 2 |");

  assert.ok(!spoken.includes("|") && !spoken.includes("---"));
  assert.match(spoken, /a.*b.*1.*2/);
});

test("a bare address is read as the word link", () => {
  assert.equal(cleanForSpeech("See https://example.com/a/b?c=d now"), "See link now.");
});

test("sentences are grouped into chunks under the limit and never split mid-word", () => {
  const sentence = "This is one fairly ordinary sentence.";
  const text = Array(10).fill(sentence).join(" ");
  const chunks = chunkForSpeech(text, 100);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 100));
  assert.equal(chunks.join(" "), text);
});

test("one very long sentence is cut at spaces", () => {
  const text = `${"word ".repeat(100)}end.`;
  const chunks = chunkForSpeech(text, 50);

  assert.ok(chunks.every((c) => c.length <= 50));
  assert.equal(chunks.join(" "), text);
});

test("text with no sentence ending is still spoken, and nothing gives nothing", () => {
  assert.deepEqual(chunkForSpeech("no ending here"), ["no ending here"]);
  assert.deepEqual(chunkForSpeech(""), []);
});

const voice = (name: string, lang = "en-US", localService = true) => ({ name, lang, localService, voiceURI: name });

test("the saved voice wins while it still exists", () => {
  const voices = [voice("Google US English", "en-US", false), voice("Fred")];

  assert.equal(pickVoice(voices, "Fred")?.name, "Fred");
  assert.equal(pickVoice(voices, "Gone")?.name, "Google US English");
});

test("natural voices beat novelty and compact ones, and other languages are skipped", () => {
  const voices = [voice("Zarvox"), voice("Hindi", "hi-IN"), voice("Alex Compact"), voice("Microsoft Aria Online (Natural)", "en-US", false), voice("Fred")];

  assert.equal(pickVoice(voices)?.name, "Microsoft Aria Online (Natural)");
  assert.equal(pickVoice([voice("Hindi", "hi-IN")]), undefined);
});
