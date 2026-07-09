import test from "node:test";
import assert from "node:assert/strict";

import { createRunState, appendEvent } from "../../src/core/events.js";

test("createRunState starts a run with an agent.started event", () => {
  const state = createRunState({
    taskId: "task-1",
    runId: "run-1",
    now: () => new Date("2026-07-09T00:00:00.000Z")
  });

  assert.equal(state.taskId, "task-1");
  assert.equal(state.runId, "run-1");
  assert.equal(state.status, "running");
  assert.deepEqual(state.events, [
    {
      type: "agent.started",
      taskId: "task-1",
      runId: "run-1",
      timestamp: "2026-07-09T00:00:00.000Z"
    }
  ]);
});

test("appendEvent preserves order and stamps runtime metadata", () => {
  const state = createRunState({
    taskId: "task-1",
    runId: "run-1",
    now: () => new Date("2026-07-09T00:00:00.000Z")
  });

  const updated = appendEvent(
    state,
    { type: "llm.started", model: "scripted", purpose: "main" },
    { now: () => new Date("2026-07-09T00:00:01.000Z") }
  );

  assert.equal(updated.events.length, 2);
  assert.deepEqual(updated.events[1], {
    type: "llm.started",
    taskId: "task-1",
    runId: "run-1",
    timestamp: "2026-07-09T00:00:01.000Z",
    model: "scripted",
    purpose: "main"
  });
  assert.equal(state.events.length, 1);
});
