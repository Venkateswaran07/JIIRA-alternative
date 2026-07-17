import assert from "node:assert/strict";
import test from "node:test";
import { applyAction, conditionMatches } from "./rules.js";

test("automation conditions match supported ticket fields", () => {
  const ticket = { status: "Done", priority: "high", blocked: false };
  assert.equal(conditionMatches("status = Done", ticket), true);
  assert.equal(conditionMatches("priority=low", ticket), false);
  assert.equal(conditionMatches("always", ticket), true);
  assert.equal(conditionMatches("unsupported condition", ticket), false);
});

test("automation actions update supported ticket fields", () => {
  const ticket = { priority: "low", blocked: false, labels: ["api"] };
  applyAction("set priority = critical", ticket);
  applyAction("mark blocked", ticket);
  applyAction("add label = release", ticket);
  applyAction("add label = release", ticket);
  assert.equal(ticket.priority, "critical");
  assert.equal(ticket.blocked, true);
  assert.deepEqual(ticket.labels, ["api", "release"]);
});
