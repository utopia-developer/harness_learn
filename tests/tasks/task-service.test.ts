import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { createFileTaskService } from "../../src/tasks/task-service.js";
import type { AgentEvent } from "../../src/core/events.js";

async function withTempStore<T>(run: (rootDir: string) => Promise<T>): Promise<T> {
  const rootDir = await mkdtemp(join(tmpdir(), "harness-tasks-"));
  try {
    return await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

function event(input: Partial<AgentEvent> & Pick<AgentEvent, "type">): AgentEvent {
  return {
    taskId: "task-1",
    runId: "run-1",
    traceId: "trace-1",
    timestamp: "2026-07-10T00:00:00.000Z",
    ...input
  } as AgentEvent;
}

test("createFileTaskService persists tasks across service instances", async () => {
  await withTempStore(async (rootDir) => {
    const service = createFileTaskService({
      rootDir,
      now: () => new Date("2026-07-10T00:00:00.000Z")
    });

    await service.createTask({
      id: "task-1",
      projectId: "project-1",
      userId: "user-1",
      goal: "Ship the harness"
    });

    const reloaded = createFileTaskService({ rootDir });
    assert.deepEqual(await reloaded.getTask("task-1"), {
      id: "task-1",
      projectId: "project-1",
      userId: "user-1",
      goal: "Ship the harness",
      status: "pending",
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z"
    });
  });
});

test("task events are persisted and update task status", async () => {
  await withTempStore(async (rootDir) => {
    const service = createFileTaskService({
      rootDir,
      now: () => new Date("2026-07-10T00:00:00.000Z")
    });
    await service.createTask({
      id: "task-1",
      projectId: "project-1",
      userId: "user-1",
      goal: "Ship the harness"
    });

    await service.appendRunEvent(event({ type: "agent.started" }));
    await service.appendRunEvent(event({
      type: "permission.requested",
      callId: "call-1",
      tool: "run_command",
      input: { cmd: "npm test" },
      mode: "default",
      reason: "Tool requires approval"
    }));
    await service.appendRunEvent(event({ type: "agent.completed", output: "done" }));

    assert.equal((await service.getTask("task-1"))?.status, "completed");
    assert.deepEqual((await service.listRunEvents("task-1", "run-1")).map((item) => item.type), [
      "agent.started",
      "permission.requested",
      "agent.completed"
    ]);
  });
});

test("createFileTaskService saves and reloads the latest checkpoint", async () => {
  await withTempStore(async (rootDir) => {
    const service = createFileTaskService({
      rootDir,
      now: () => new Date("2026-07-10T00:00:00.000Z")
    });
    await service.createTask({
      id: "task-1",
      projectId: "project-1",
      userId: "user-1",
      goal: "Ship the harness"
    });

    await service.saveCheckpoint({
      id: "checkpoint-1",
      taskId: "task-1",
      runId: "run-1",
      state: { iteration: 1, note: "before tool" }
    });
    await service.saveCheckpoint({
      id: "checkpoint-2",
      taskId: "task-1",
      runId: "run-1",
      state: { iteration: 2, note: "after tool" }
    });

    const reloaded = createFileTaskService({ rootDir });
    assert.deepEqual(await reloaded.getLatestCheckpoint("task-1"), {
      id: "checkpoint-2",
      taskId: "task-1",
      runId: "run-1",
      state: { iteration: 2, note: "after tool" },
      createdAt: "2026-07-10T00:00:00.000Z"
    });
  });
});
