import { test } from "node:test";
import assert from "node:assert/strict";
import { FACTS, GREETING, JOKES, NATURE_FACTS, ONE_PIECE_FACTS, TECH_FACTS, THOUGHTS, WORKING, nextLine } from "@/components/chat/chopperLines";

const all = [GREETING, ...FACTS, ...TECH_FACTS, ...NATURE_FACTS, ...ONE_PIECE_FACTS, ...JOKES, ...THOUGHTS, ...WORKING];

test("every line is unique and short enough for the speech bubble", () => {
  assert.equal(new Set(all).size, all.length);
  for (const line of all) assert.ok(line.length <= 120, `too long (${line.length}): ${line}`);
});

test("the next line is never the one just shown", () => {
  for (let i = 0; i < 300; i++) {
    const previous = nextLine(null);
    assert.notEqual(nextLine(previous), previous);
  }
});

test("jokes and One Piece facts are in the rotation", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 3000; i++) seen.add(nextLine(null));
  assert.ok(JOKES.every((line) => seen.has(line)));
  assert.ok(ONE_PIECE_FACTS.every((line) => seen.has(line)));
});
