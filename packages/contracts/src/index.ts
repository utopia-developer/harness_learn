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

export type ApprovalStatus = "pending" | "approved" | "denied";

export type ApprovalRiskLevel = "low" | "medium" | "high";

export type ApprovalRiskDto = {
  level: ApprovalRiskLevel;
  explanation: string;
  factors: string[];
};

export type PolicySuggestionStatus = "pending" | "applied";

export type PolicySuggestionDto = {
  id: string;
  title: string;
  description: string;
  status: PolicySuggestionStatus;
};

export type ApprovalDto = {
  id: string;
  taskId: string;
  runId: string;
  traceId: string;
  callId: string;
  tool: string;
  mode: string;
  reason: string;
  requestedAt: string;
  status: ApprovalStatus;
  input: unknown;
  risk: ApprovalRiskDto;
  suggestions: PolicySuggestionDto[];
};

export type ApprovalQueueResponse = {
  approvals: ApprovalDto[];
  total: number;
  filters: {
    status: ApprovalStatus | "all";
  };
};

export type ApprovalActionRequest = {
  reason?: string;
  confirmedRisk?: boolean;
};

export type ApprovalActionResponse = {
  approval: ApprovalDto;
  runEffect: {
    runId: string;
    status: "continues" | "failed";
    message: string;
  };
};

export type ApplyPolicySuggestionResponse = {
  suggestion: PolicySuggestionDto;
};

export type ReleaseReadinessStatus = "ready" | "blocked";

export type ReleaseSummaryDto = {
  id: string;
  projectId: string;
  version: string;
  title: string;
  status: ReleaseReadinessStatus;
  generatedAt: string;
};

export type ReleaseGateCheckDto = {
  name: "eval" | "cost" | "quality";
  label: string;
  passed: boolean;
  detail: string;
};

export type ReleaseEvidenceDto = {
  auditEventCount: number;
  auditJsonlHref: string;
  traceIds: string[];
};

export type ListReleasesResponse = {
  releases: ReleaseSummaryDto[];
  total: number;
};

export type ReleaseReadinessResponse = {
  release: ReleaseSummaryDto;
  summary: string;
  checks: ReleaseGateCheckDto[];
  blockers: string[];
  evidence: ReleaseEvidenceDto;
};

export type ReleaseGateActionResponse = {
  releaseId: string;
  status: ReleaseReadinessStatus;
  message: string;
  readiness: ReleaseReadinessResponse;
};

export type ProjectPolicyDto = {
  allowedTools: string[];
  allowedModels: string[];
};

export type ProjectPolicyResponse = {
  project: {
    id: string;
    teamId: string;
    name: string;
  };
  policy: ProjectPolicyDto;
  availableTools: string[];
  availableModels: string[];
};

export type UpdateProjectPolicyRequest = ProjectPolicyDto;

export type PolicySimulationRequest = {
  tool?: string;
  model?: string;
};

export type PolicySimulationDecisionDto = {
  name: string;
  allowed: boolean;
  reason: string;
};

export type PolicySimulationResponse = {
  projectId: string;
  tool: PolicySimulationDecisionDto;
  model: PolicySimulationDecisionDto;
};

export type TeamPluginDto = {
  id: string;
  name: string;
  version: string;
  tools: string[];
  skills: string[];
  installed: boolean;
  enabled: boolean;
};

export type TeamPluginsResponse = {
  teamId: string;
  plugins: TeamPluginDto[];
  sharedSkills: string[];
};

export type PluginActionResponse = {
  teamId: string;
  plugin: TeamPluginDto;
  sharedSkills: string[];
  message: string;
};

export type UserRole = "viewer" | "developer" | "admin";

export type SessionResponse = {
  user: {
    id: string;
    name: string;
    role: UserRole;
  };
  permissions: {
    canEditPolicy: boolean;
    canApproveDangerous: boolean;
    canManagePlugins: boolean;
  };
};

export type FrontendAuditEventRequest = {
  action: string;
  target: string;
  route: string;
  metadata?: Record<string, string | number | boolean>;
};

export type FrontendAuditEventDto = {
  id: string;
  actorId: string;
  role: UserRole;
  action: string;
  target: string;
  route: string;
  metadata: Record<string, string | number | boolean>;
  recordedAt: string;
};

export type FrontendAuditEventResponse = {
  event: FrontendAuditEventDto;
};

export type MetricsCostBreakdownItemDto = {
  name: string;
  costUsd: number;
};

export type MetricsCostResponse = {
  projectId: string;
  totalCostUsd: number;
  modelCostUsd: number;
  toolCostUsd: number;
  byModel: MetricsCostBreakdownItemDto[];
  byTool: MetricsCostBreakdownItemDto[];
  bySkill: MetricsCostBreakdownItemDto[];
};

export type MetricsQualityPointDto = {
  suiteId: string;
  passed: boolean;
  score: number;
  timestamp: string;
};

export type MetricsQualityResponse = {
  projectId: string;
  totalRuns: number;
  passRate: number;
  averageScore: number;
  points: MetricsQualityPointDto[];
};

export type MetricsRuntimeResponse = {
  projectId: string;
  totalRuns: number;
  successRate: number;
  averageIterations: number;
  averageApprovalWaitMs: number;
  byStatus: {
    completed: number;
    failed: number;
    cancelled: number;
  };
};

export const API_ENDPOINTS = {
  health: "/api/v1/health",
  session: "/api/v1/session",
  frontendAuditEvents: "/api/v1/frontend/audit-events",
  consoleDashboard: "/api/v1/console/dashboard",
  tasks: "/api/v1/tasks",
  releases: "/api/v1/releases",
  releaseSummary: "/api/v1/releases/summary",
  releaseReadiness: (releaseId: string) => `/api/v1/releases/${releaseId}/readiness`,
  runReleaseGate: (releaseId: string) => `/api/v1/releases/${releaseId}/gate`,
  releaseAuditJsonl: (releaseId: string) => `/api/v1/releases/${releaseId}/audit.jsonl`,
  projectPolicy: (projectId: string) => `/api/v1/projects/${projectId}/policy`,
  simulateProjectPolicy: (projectId: string) =>
    `/api/v1/projects/${projectId}/policy/simulate`,
  teamPlugins: (teamId: string) => `/api/v1/teams/${teamId}/plugins`,
  installTeamPlugin: (teamId: string, pluginId: string) =>
    `/api/v1/teams/${teamId}/plugins/${pluginId}/install`,
  enableTeamPlugin: (teamId: string, pluginId: string) =>
    `/api/v1/teams/${teamId}/plugins/${pluginId}/enable`,
  disableTeamPlugin: (teamId: string, pluginId: string) =>
    `/api/v1/teams/${teamId}/plugins/${pluginId}/disable`,
  metricsSummary: "/api/v1/metrics/summary",
  metricsCost: (projectId: string) => `/api/v1/metrics/cost?projectId=${encodeURIComponent(projectId)}`,
  metricsQuality: (projectId: string) => `/api/v1/metrics/quality?projectId=${encodeURIComponent(projectId)}`,
  metricsRuntime: (projectId: string) => `/api/v1/metrics/runtime?projectId=${encodeURIComponent(projectId)}`,
  runTrace: (taskId: string, runId: string) =>
    `/api/v1/tasks/${taskId}/runs/${runId}/trace`,
  runStream: (taskId: string, runId: string) =>
    `/api/v1/tasks/${taskId}/runs/${runId}/stream`,
  toolOutput: (ref: string) => `/api/v1/tool-outputs/${encodeURIComponent(ref)}`,
  replayCase: (traceId: string) => `/api/v1/traces/${traceId}/replay-case`,
  approvals: "/api/v1/approvals",
  approveApproval: (approvalId: string) => `/api/v1/approvals/${approvalId}/approve`,
  denyApproval: (approvalId: string) => `/api/v1/approvals/${approvalId}/deny`,
  applyPolicySuggestion: (suggestionId: string) =>
    `/api/v1/policies/suggestions/${suggestionId}/apply`
} as const;

export const WEB_ROUTES = {
  tasks: "/tasks",
  approvals: "/approvals",
  releaseReadiness: (releaseId: string) => `/releases/${releaseId}`,
  runDetail: (taskId: string, runId: string) => `/tasks/${taskId}/runs/${runId}`,
  metrics: "/metrics",
  policy: "/settings/policy",
  plugins: "/settings/plugins"
} as const;
