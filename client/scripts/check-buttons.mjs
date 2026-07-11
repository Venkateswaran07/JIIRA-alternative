import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const buttons = [...source.matchAll(/<button\b([^>]*)>/gs)].map((match) => ({
  attributes: match[1].replace(/\s+/g, " ").trim(),
  line: source.slice(0, match.index).split("\n").length,
}));
const inert = buttons.filter(({ attributes }) => !/(onClick|type=["']submit["']|disabled)/.test(attributes));
assert.deepEqual(inert, [], `Every button must have an action or disabled state: ${JSON.stringify(inert)}`);
console.log(`Verified ${buttons.length} button contracts.`);
