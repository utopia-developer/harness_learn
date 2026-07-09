import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryStore } from "../../src/memory/memory-store.js";

test("createMemoryStore appends and lists records immutably", async () => {
  const store = createMemoryStore();

  const record = await store.add({
    taskId: "task-1",
    runId: "run-1",
    kind: "task_summary",
    content: "完成了阶段 3 记忆能力",
    createdAt: "2026-07-09T00:00:00.000Z"
  });

  assert.equal(record.id, "memory-1");
  const listed = store.list();
  listed[0].content = "mutated";

  assert.equal(store.list()[0].content, "完成了阶段 3 记忆能力");
});
