import test from "node:test";
import assert from "node:assert/strict";

import {
  createRunDetailViewModel,
  parseRunStreamSnapshot
} from "../../apps/web/src/features/runs/run-detail-view-model.js";
import type { RunTraceResponse } from "../../packages/contracts/src/index.js";

test("run detail view model exposes timeline, selected event and failure module", () => {
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
        callId: "call-1",
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
        callId: "call-1",
        outputRef: "tool-output://run-failed-demo/call-1",
        truncated: true
      }
    ]
  };

  const viewModel = createRunDetailViewModel(trace, "trace-failed-demo:2");

  assert.equal(viewModel.header.status.label, "Failed");
  assert.equal(viewModel.failure?.module, "tool");
  assert.equal(viewModel.timeline[0].kind, "tool");
  assert.equal(viewModel.timeline[1].hasOutputRef, true);
  assert.equal(viewModel.selectedEvent?.id, "trace-failed-demo:2");
  assert.equal(viewModel.selectedEvent?.outputRefHref, "/api/v1/tool-outputs/tool-output%3A%2F%2Frun-failed-demo%2Fcall-1");
});

test("parseRunStreamSnapshot reads server-sent trace events", () => {
  const events = parseRunStreamSnapshot([
    "event: trace.event",
    "data: {\"id\":\"event-1\",\"sequence\":1,\"type\":\"permission.requested\",\"timestamp\":\"2026-07-10T00:00:00.000Z\",\"title\":\"Permission requested\",\"summary\":\"needs approval\",\"severity\":\"warning\"}",
    "",
    "event: trace.event",
    "data: {\"id\":\"event-2\",\"sequence\":2,\"type\":\"agent.completed\",\"timestamp\":\"2026-07-10T00:00:01.000Z\",\"title\":\"Agent completed\",\"summary\":\"done\",\"severity\":\"success\"}",
    ""
  ].join("\n"));

  assert.deepEqual(events.map((event: { type: string }) => event.type), [
    "permission.requested",
    "agent.completed"
  ]);
});
