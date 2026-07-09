import test from "node:test";
import assert from "node:assert/strict";

import { ScriptedModelClient } from "../../src/model/scripted-model.js";

test("ScriptedModelClient yields scripted text chunks in order", async () => {
  const model = new ScriptedModelClient("scripted", [
    [
      { type: "text_delta", text: "hello" },
      { type: "text_delta", text: " world" },
      { type: "message_completed", text: "hello world" }
    ]
  ]);

  const chunks = [];
  for await (const chunk of model.streamResponse({ messages: [] })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, [
    { type: "text_delta", text: "hello" },
    { type: "text_delta", text: " world" },
    { type: "message_completed", text: "hello world" }
  ]);
});

test("ScriptedModelClient advances one response per model call", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "tool_call", callId: "call-1", name: "read_file", input: { path: "a.txt" } }],
    [{ type: "message_completed", text: "done" }]
  ]);

  const first = [];
  for await (const chunk of model.streamResponse({ messages: [] })) {
    first.push(chunk);
  }

  const second = [];
  for await (const chunk of model.streamResponse({ messages: [] })) {
    second.push(chunk);
  }

  assert.deepEqual(first, [
    { type: "tool_call", callId: "call-1", name: "read_file", input: { path: "a.txt" } }
  ]);
  assert.deepEqual(second, [{ type: "message_completed", text: "done" }]);
});
