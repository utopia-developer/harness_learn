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

export const API_ENDPOINTS = {
  health: "/api/v1/health",
  consoleDashboard: "/api/v1/console/dashboard"
} as const;

export const WEB_ROUTES = {
  tasks: "/tasks",
  approvals: "/approvals",
  releaseReadiness: (releaseId: string) => `/releases/${releaseId}`,
  runDetail: (taskId: string, runId: string) => `/tasks/${taskId}/runs/${runId}`,
  policy: "/settings/policy",
  plugins: "/settings/plugins"
} as const;
