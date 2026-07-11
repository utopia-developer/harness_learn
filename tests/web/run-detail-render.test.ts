import test from "node:test";
import assert from "node:assert/strict";

import { renderAppHtml } from "../../apps/web/src/app/render.js";
import type { RunTraceResponse } from "../../packages/contracts/src/index.js";

test("run detail page renders timeline, event detail, output ref and replay entry", () => {
  const trace: RunTraceResponse = {
    taskId: "task-failed-demo",
    runId: "run-failed-demo",
    traceId: "trace-failed-demo",
    status: "failed",
    failure: {
      module: "tool",
      message: "test failed"
    },
    events: [
      {
        id: "trace-failed-demo:1",
        sequence: 1,
        type: "tool.requested",
        timestamp: "2026-07-10T00:00:01.000Z",
        title: "Tool requested",
        summary: "run_command",
        severity: "warning",
        callId: "tool-call-failed",
        tool: "run_command",
        input: { cmd: "npm test" }
      },
      {
        id: "trace-failed-demo:2",
        sequence: 2,
        type: "tool.completed",
        timestamp: "2026-07-10T00:00:02.000Z",
        title: "Tool completed",
        summary: "Output stored by reference.",
        severity: "success",
        callId: "tool-call-failed",
        outputRef: "tool-output://run-failed-demo/tool-call-failed",
        truncated: true
      }
    ]
  };

  const html = renderAppHtml({
    state: "ready",
    pathname: "/tasks/task-failed-demo/runs/run-failed-demo",
    runDetail: {
      trace,
      selectedEventId: "trace-failed-demo:1"
    }
  });

  assert.match(html, /Trace 时间线/);
  assert.match(html, /失败模块/);
  assert.match(html, /tool/);
  assert.match(html, /Tool requested/);
  assert.match(html, /npm test/);
  assert.match(html, /\/api\/v1\/traces\/trace-failed-demo\/replay-case/);
  assert.match(html, /tool-output%3A%2F%2Frun-failed-demo%2Ftool-call-failed/);
});
