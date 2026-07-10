import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { renderAppHtml } from "../../apps/web/src/app/render.js";
import type { RunTraceResponse } from "../../packages/contracts/src/index.js";

test("run trace page stays within the large-trace render budget", () => {
  const startedAt = performance.now();
  const html = renderAppHtml({
    state: "ready",
    pathname: "/tasks/task-large/runs/run-large",
    runDetail: {
      trace: largeTrace(300),
      selectedEventId: "trace-large:299"
    }
  });
  const elapsedMs = performance.now() - startedAt;

  assert.equal(html.includes("Trace Timeline"), true);
  assert.equal(html.includes("Trace event 299"), true);
  assert.ok(elapsedMs < 500, `expected render under 500ms, got ${elapsedMs}`);
  assert.ok(html.length < 250_000, `expected html under 250KB, got ${html.length}`);
});

function largeTrace(eventCount: number): RunTraceResponse {
  return {
    taskId: "task-large",
    runId: "run-large",
    traceId: "trace-large",
    status: "running",
    events: Array.from({ length: eventCount }, (_, index) => ({
      id: `trace-large:${index + 1}`,
      sequence: index + 1,
      type: index % 3 === 0 ? "tool.requested" : "llm.delta",
      timestamp: "2026-07-10T00:00:00.000Z",
      title: `Trace event ${index + 1}`,
      summary: `Large trace event ${index + 1}`,
      severity: index % 11 === 0 ? "warning" : "info",
      tool: index % 3 === 0 ? "read_file" : undefined,
      input: index === eventCount - 1 ? { path: "apps/web/src/app/render.ts" } : undefined
    }))
  };
}
