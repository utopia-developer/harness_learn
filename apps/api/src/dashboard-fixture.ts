import type { AgentEvent } from "../../../src/core/events.js";
import { createConsoleDashboard } from "../../../src/console/console-view.js";
import type { ApprovalRecord } from "../../../src/permissions/types.js";
import type { TaskRecord } from "../../../src/tasks/task-service.js";
import type { AgentTrace } from "../../../src/trace/trace-collector.js";
import type { ConsoleDashboardResponse } from "../../../packages/contracts/src/index.js";

const timestamp = "2026-07-10T00:00:00.000Z";

export function createDemoConsoleDashboard(): ConsoleDashboardResponse {
  const task: TaskRecord = {
    id: "task-f0-demo",
    projectId: "project-harness",
    userId: "user-demo",
    goal: "验证前端 F0 Console Dashboard 闭环",
    status: "waiting_approval",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const events: AgentEvent[] = [
    {
      type: "agent.started",
      taskId: task.id,
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      timestamp
    },
    {
      type: "llm.started",
      taskId: task.id,
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      timestamp,
      model: "gpt-5",
      purpose: "plan_frontend_baseline"
    },
    {
      type: "tool.requested",
      taskId: task.id,
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      timestamp,
      callId: "tool-call-f0",
      tool: "exec_command",
      input: { cmd: "npm test" }
    },
    {
      type: "permission.requested",
      taskId: task.id,
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      timestamp,
      callId: "tool-call-f0",
      tool: "exec_command",
      input: { cmd: "npm test" },
      mode: "default",
      reason: "需要执行测试验证前后端契约"
    }
  ];

  const trace: AgentTrace = {
    traceId: "trace-f0-demo",
    taskId: task.id,
    runId: "run-f0-demo",
    events
  };

  const approvals: ApprovalRecord[] = [];

  return createConsoleDashboard({
    tasks: [task],
    traces: [trace],
    approvals
  });
}
