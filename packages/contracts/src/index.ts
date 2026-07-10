export type TaskStatus =
  | "pending"
  | "planning"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type TraceStatus = "running" | "completed" | "failed" | "cancelled";

export type ConsoleTaskCardDto = {
  id: string;
  projectId: string;
  goal: string;
  status: TaskStatus;
  updatedAt: string;
  traceCount: number;
  pendingApprovalCount: number;
};

export type ConsoleTraceSummaryDto = {
  traceId: string;
  taskId: string;
  runId: string;
  eventCount: number;
  llmCallCount: number;
  toolCallCount: number;
  permissionRequestCount: number;
  status: TraceStatus;
  failure?: {
    module: "agent" | "llm" | "tool" | "permission";
    message: string;
  };
};

export type ConsolePendingApprovalDto = {
  taskId: string;
  runId: string;
  traceId: string;
  callId: string;
  tool: string;
  mode: string;
  reason: string;
  requestedAt: string;
};

export type ConsoleDashboardResponse = {
  tasks: ConsoleTaskCardDto[];
  traces: ConsoleTraceSummaryDto[];
  pendingApprovals: ConsolePendingApprovalDto[];
};

export type TaskReleaseGateStatus = "ready" | "blocked" | "warning" | "not_applicable";

export type TaskCenterTaskDto = {
  id: string;
  projectId: string;
  userId: string;
  goal: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  traceCount: number;
  pendingApprovalCount: number;
  releaseGateStatus: TaskReleaseGateStatus;
  costUsd: number;
};

export type TaskSortKey = "updated_desc" | "updated_asc" | "status_asc" | "goal_asc";

export type ListTasksQuery = {
  status?: TaskStatus | "all";
  search?: string;
  sort?: TaskSortKey;
};

export type ListTasksResponse = {
  tasks: TaskCenterTaskDto[];
  total: number;
  filters: Required<ListTasksQuery>;
};

export type CreateTaskRequest = {
  projectId: string;
  userId: string;
  goal: string;
};

export type CreateTaskResponse = {
  task: TaskCenterTaskDto;
};

export type ReleaseSummaryResponse = {
  ready: number;
  blocked: number;
  warning: number;
};

export type MetricsSummaryResponse = {
  activeTasks: number;
  waitingApprovalTasks: number;
  costTodayUsd: number;
};

export type RunTraceStatus = "running" | "completed" | "failed" | "cancelled";

export type RunTraceEventType =
  | "agent.started"
  | "llm.started"
  | "llm.delta"
  | "tool.requested"
  | "tool.completed"
  | "permission.requested"
  | "permission.resolved"
  | "agent.completed"
  | "agent.failed"
  | "agent.cancelled";

export type RunTraceEventSeverity = "info" | "success" | "warning" | "error";

export type RunTraceEventDto = {
  id: string;
  sequence: number;
  type: RunTraceEventType;
  timestamp: string;
  title: string;
  summary: string;
  severity: RunTraceEventSeverity;
  callId?: string;
  tool?: string;
  model?: string;
  input?: unknown;
  output?: string;
  outputRef?: string;
  truncated?: boolean;
  permission?: {
    mode?: string;
    decision?: string;
    reason: string;
  };
};

export type RunTraceResponse = {
  taskId: string;
  runId: string;
  traceId: string;
  status: RunTraceStatus;
  events: RunTraceEventDto[];
  failure?: {
    module: "agent" | "llm" | "tool" | "permission";
    message: string;
  };
};

export type ToolOutputResponse = {
  ref: string;
  taskId: string;
  runId: string;
  callId: string;
  tool: string;
  content: string;
  bytes: number;
};

export type ReplayCaseResponse = {
  id: string;
  traceId: string;
  taskId: string;
  userMessage: string;
  expectedOutput: string;
  expectedTools: string[];
};

export const API_ENDPOINTS = {
  health: "/api/v1/health",
  consoleDashboard: "/api/v1/console/dashboard",
  tasks: "/api/v1/tasks",
  releaseSummary: "/api/v1/releases/summary",
  metricsSummary: "/api/v1/metrics/summary",
  runTrace: (taskId: string, runId: string) =>
    `/api/v1/tasks/${taskId}/runs/${runId}/trace`,
  runStream: (taskId: string, runId: string) =>
    `/api/v1/tasks/${taskId}/runs/${runId}/stream`,
  toolOutput: (ref: string) => `/api/v1/tool-outputs/${encodeURIComponent(ref)}`,
  replayCase: (traceId: string) => `/api/v1/traces/${traceId}/replay-case`
} as const;

export const WEB_ROUTES = {
  tasks: "/tasks",
  approvals: "/approvals",
  releaseReadiness: (releaseId: string) => `/releases/${releaseId}`,
  runDetail: (taskId: string, runId: string) => `/tasks/${taskId}/runs/${runId}`,
  policy: "/settings/policy",
  plugins: "/settings/plugins"
} as const;
