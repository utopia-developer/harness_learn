import test from "node:test";
import assert from "node:assert/strict";

import {
  createAuditLog,
  createSandboxPool,
  createWorkerPool
} from "../../src/ops/runtime-ops.js";

test("createWorkerPool runs tasks with bounded concurrency", async () => {
  const workerPool = createWorkerPool({ concurrency: 2 });
  let running = 0;
  let maxRunning = 0;

  const results = await Promise.all([
    workerPool.enqueue(async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
      return "a";
    }),
    workerPool.enqueue(async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
      return "b";
    }),
    workerPool.enqueue(async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
      return "c";
    })
  ]);

  assert.deepEqual(results.sort(), ["a", "b", "c"]);
  assert.equal(maxRunning, 2);
});

test("createSandboxPool leases isolated sandboxes and releases them", () => {
  const pool = createSandboxPool([
    { id: "sandbox-1", provider: "local" },
    { id: "sandbox-2", provider: "local" }
  ]);

  const lease = pool.acquire("task-1");
  assert.equal(lease.taskId, "task-1");
  assert.equal(pool.availableCount(), 1);

  pool.release(lease.id);

  assert.equal(pool.availableCount(), 2);
});

test("createAuditLog records and exports JSONL audit events", () => {
  const audit = createAuditLog();

  audit.record({
    timestamp: "2026-07-10T00:00:00.000Z",
    actorId: "u-admin",
    action: "plugin.enabled",
    target: "review-pack",
    projectId: "project-1"
  });
  audit.record({
    timestamp: "2026-07-10T00:00:01.000Z",
    actorId: "worker-1",
    action: "task.completed",
    target: "task-1"
  });

  assert.equal(
    audit.exportJsonl(),
    [
      '{"timestamp":"2026-07-10T00:00:00.000Z","actorId":"u-admin","action":"plugin.enabled","target":"review-pack","projectId":"project-1"}',
      '{"timestamp":"2026-07-10T00:00:01.000Z","actorId":"worker-1","action":"task.completed","target":"task-1"}'
    ].join("\n")
  );
});
