import assert from "node:assert/strict";
import { test } from "node:test";
import extension from "./index.ts";
import { readabilityGrade } from "./readability.ts";

test("local document grade and final-response footer", async () => {
  for (const [text, grade] of [
    ["Go now.", 0],
    ["The batching change is operational.", 9],
    ["Internationalization complicates communication.", 49],
    ["Go now. Internationalization complicates communication.", 26],
    ["Dr. Smith met Mr. Jones. They discussed clear communication.", 6],
    ["## Introduction\n- **Complexity** in [documentation](https://example.com) increases confusion.\n- [x] Read [[Page|the summary]].", 16],
    ["Use `npm install example`.\n```js\nconst result = complicatedFunction();\n```\nDone.", 12],
    ["", undefined], ["世界 🙂", undefined], ["... !!!", undefined], ["a".repeat(1_000_001), undefined],
  ]) assert.equal(readabilityGrade(text), grade);

  const handlers = new Map(), statuses = new Map([["other-extension", "keep"]]);
  const key = "pi-hemingway-output-readability-score";
  const message = { role: "assistant", stopReason: "stop", content: [
    { type: "thinking", thinking: "Never score private thinking." },
    { type: "text", text: "The batching change is operational." },
  ] };
  let entries = [{ type: "message", message }], idle = true;
  const ctx = { hasUI: true, isIdle: () => idle, sessionManager: { getBranch: () => entries },
    ui: { setStatus: (key, text) => text === undefined ? statuses.delete(key) : statuses.set(key, text) } };
  // Only registration and status updates are available: no model calls or history writes.
  extension({ on: (name, handler) => handlers.set(name, handler) });
  const fire = async (name, context = ctx) => handlers.get(name)?.({}, context);
  await fire("message_end");
  await fire("agent_end");
  assert.equal(statuses.get(key), undefined);
  const original = JSON.stringify(entries);
  await fire("agent_settled");
  assert.equal(statuses.get(key), "Hemingway: Grade 9");
  assert.equal(JSON.stringify(entries), original);
  assert.equal(statuses.get("other-extension"), "keep");
  for (const clear of ["agent_start", "session_shutdown"]) {
    await fire(clear);
    assert.equal(statuses.get(key), undefined);
    await fire("session_start");
    assert.equal(statuses.get(key), "Hemingway: Grade 9");
  }
  idle = false;
  await fire("agent_settled");
  assert.equal(statuses.get(key), undefined);
  idle = true;
  for (const stopReason of ["pending", "aborted", "error", "toolUse", "length", "deferred"]) {
    entries = [{ type: "message", message }, { type: "message", message: { ...message, stopReason } }];
    await fire("agent_settled");
    assert.equal(statuses.get(key), undefined, stopReason);
  }
  entries = [{ type: "message", message: { ...message, content: [{ type: "text", text: "Go now." }] } }];
  await fire("session_tree");
  assert.equal(statuses.get(key), "Hemingway: Grade 0");
  entries = [{ type: "message", message: { role: "user", content: "Ignore this." } }];
  await fire("session_start");
  assert.equal(statuses.get(key), undefined);
  for (const name of handlers.keys()) await fire(name, { hasUI: false });
});
