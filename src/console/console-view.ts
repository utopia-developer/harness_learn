import type { AgentEvent, PermissionRequestedEvent } from "../core/events.js";
import type { ApprovalRecord } from "../permissions/types.js";
import type { TaskRecord, TaskStatus } from "../tasks/task-service.js";
import type { AgentTrace, TraceFailure } from "../trace/trace-collector.js";

export type ConsoleTaskCard = {
  id: string;
  projectId: string;
  goal: string;
  status: TaskStatus;
  updatedAt: string;
  traceCount: number;
  pendingApprovalCount: number;
};

export type ConsoleTraceSummary = {
  traceId: string;
  taskId: string;
  runId: string;
  eventCount: number;
  llmCallCount: number;
  toolCallCount: number;
  permissionRequestCount: number;
  status: "running" | "completed" | "failed" | "cancelled";
  failure?: TraceFailure;
};

export type ConsolePendingApproval = {
  taskId: string;
  runId: string;
  traceId: string;
  callId: string;
  tool: string;
  mode: string;
  reason: string;
  requestedAt: string;
};

export type ConsoleDashboard = {
  tasks: ConsoleTaskCard[];
  traces: ConsoleTraceSummary[];
  pendingApprovals: ConsolePendingApproval[];
};

export type ConsoleDashboardInput = {
  tasks: TaskRecord[];
  traces: AgentTrace[];
  approvals: ApprovalRecord[];
};

export function createConsoleDashboard(input: ConsoleDashboardInput): ConsoleDashboard {
  const pendingApprovals = collectPendingApprovals(input.traces, input.approvals);

  return {
    tasks: input.tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      goal: task.goal,
      status: task.status,
      updatedAt: task.updatedAt,
      traceCount: input.traces.filter((trace) => trace.taskId === task.id).length,
      pendingApprovalCount: pendingApprovals.filter((approval) =>
        approval.taskId === task.id
      ).length
    })),
    traces: input.traces.map(summarizeTrace),
    pendingApprovals
  };
}

function summarizeTrace(trace: AgentTrace): ConsoleTraceSummary {
  return {
    traceId: trace.traceId,
    taskId: trace.taskId,
    runId: trace.runId,
    eventCount: trace.events.length,
    llmCallCount: trace.events.filter((event) => event.type === "llm.started").length,
    toolCallCount: trace.events.filter((event) => event.type === "tool.requested").length,
    permissionRequestCount: trace.events.filter((event) =>
      event.type === "permission.requested"
    ).length,
    status: inferTraceStatus(trace.events),
    ...(trace.failure ? { failure: { ...trace.failure } } : {})
  };
}

function collectPendingApprovals(
  traces: AgentTrace[],
  approvals: ApprovalRecord[]
): ConsolePendingApproval[] {
  const resolved = new Set(approvals.map((approval) => approvalKey(approval)));
  const pending: ConsolePendingApproval[] = [];

  for (const trace of traces) {
    for (const event of trace.events) {
      if (event.type !== "permission.requested") {
        continue;
      }
      if (resolved.has(approvalKey(event))) {
        continue;
      }
      pending.push(toPendingApproval(trace.traceId, event));
    }
  }

  return pending;
}

function toPendingApproval(
  traceId: string,
  event: PermissionRequestedEvent
): ConsolePendingApproval {
  return {
    taskId: event.taskId,
    runId: event.runId,
    traceId,
    callId: event.callId,
    tool: event.tool,
    mode: event.mode,
    reason: event.reason,
    requestedAt: event.timestamp
  };
}

function approvalKey(input: {
  taskId: string;
  runId: string;
  callId: string;
  tool: string;
}): string {
  return `${input.taskId}:${input.runId}:${input.callId}:${input.tool}`;
}

function inferTraceStatus(events: AgentEvent[]): ConsoleTraceSummary["status"] {
  if (events.some((event) => event.type === "agent.failed")) {
    return "failed";
  }
  if (events.some((event) => event.type === "agent.cancelled")) {
    return "cancelled";
  }
  if (events.some((event) => event.type === "agent.completed")) {
    return "completed";
  }
  return "running";
}
