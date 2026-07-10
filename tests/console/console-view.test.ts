import test from "node:test";
import assert from "node:assert/strict";

import { createConsoleDashboard } from "../../src/console/console-view.js";
import type { AgentEvent } from "../../src/core/events.js";
import type { ApprovalRecord } from "../../src/permissions/types.js";
import type { TaskRecord } from "../../src/tasks/task-service.js";
import type { AgentTrace } from "../../src/trace/trace-collector.js";

const task: TaskRecord = {
  id: "task-1",
  projectId: "project-1",
  userId: "user-1",
  goal: "Ship the harness",
  status: "waiting_approval",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:02:00.000Z"
};

function event(input: Partial<AgentEvent> & Pick<AgentEvent, "type">): AgentEvent {
  return {
    taskId: "task-1",
    runId: "run-1",
    traceId: "trace-1",
    timestamp: "2026-07-10T00:00:00.000Z",
    ...input
  } as AgentEvent;
}

test("createConsoleDashboard summarizes tasks and traces", () => {
  const trace: AgentTrace = {
    traceId: "trace-1",
    taskId: "task-1",
    runId: "run-1",
    events: [
      event({ type: "agent.started" }),
      event({ type: "llm.started", model: "gpt-5-mini", purpose: "main" }),
      event({ type: "tool.requested", callId: "call-1", tool: "run_command", input: { cmd: "npm test" } }),
      event({
        type: "permission.requested",
        callId: "call-1",
        tool: "run_command",
        input: { cmd: "npm test" },
        mode: "default",
        reason: "Tool requires approval"
      })
    ]
  };

  const dashboard = createConsoleDashboard({
    tasks: [task],
    traces: [trace],
    approvals: []
  });

  assert.deepEqual(dashboard.tasks, [
    {
      id: "task-1",
      projectId: "project-1",
      goal: "Ship the harness",
      status: "waiting_approval",
      updatedAt: "2026-07-10T00:02:00.000Z",
      traceCount: 1,
      pendingApprovalCount: 1
    }
  ]);
  assert.deepEqual(dashboard.traces, [
    {
      traceId: "trace-1",
      taskId: "task-1",
      runId: "run-1",
      eventCount: 4,
      llmCallCount: 1,
      toolCallCount: 1,
      permissionRequestCount: 1,
      status: "running"
    }
  ]);
});

test("createConsoleDashboard excludes resolved approvals from the pending queue", () => {
  const trace: AgentTrace = {
    traceId: "trace-1",
    taskId: "task-1",
    runId: "run-1",
    events: [
      event({
        type: "permission.requested",
        callId: "call-1",
        tool: "run_command",
        input: { cmd: "npm test" },
        mode: "default",
        reason: "Tool requires approval"
      }),
      event({
        type: "permission.requested",
        callId: "call-2",
        tool: "write_file",
        input: { path: "README.md" },
        mode: "accept_edits",
        reason: "Tool requires approval"
      })
    ]
  };
  const approvals: ApprovalRecord[] = [
    {
      taskId: "task-1",
      runId: "run-1",
      callId: "call-1",
      tool: "run_command",
      decision: "allow",
      reason: "Approved by user"
    }
  ];

  const dashboard = createConsoleDashboard({
    tasks: [task],
    traces: [trace],
    approvals
  });

  assert.deepEqual(dashboard.pendingApprovals, [
    {
      taskId: "task-1",
      runId: "run-1",
      traceId: "trace-1",
      callId: "call-2",
      tool: "write_file",
      mode: "accept_edits",
      reason: "Tool requires approval",
      requestedAt: "2026-07-10T00:00:00.000Z"
    }
  ]);
});

test("createConsoleDashboard exposes trace failures", () => {
  const trace: AgentTrace = {
    traceId: "trace-1",
    taskId: "task-1",
    runId: "run-1",
    events: [
      event({ type: "llm.started", model: "gpt-5-mini", purpose: "main" }),
      event({ type: "agent.failed", error: "Unknown tool: deploy" })
    ],
    failure: {
      module: "llm",
      message: "Unknown tool: deploy"
    }
  };

  const dashboard = createConsoleDashboard({
    tasks: [task],
    traces: [trace],
    approvals: []
  });

  assert.deepEqual(dashboard.traces[0].failure, {
    module: "llm",
    message: "Unknown tool: deploy"
  });
  assert.equal(dashboard.traces[0].status, "failed");
});
