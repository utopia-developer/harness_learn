import type { ApiClient, HealthResponse } from "./client.js";
import type {
  ConsoleDashboardResponse,
  CreateTaskRequest,
  CreateTaskResponse,
  ApprovalActionRequest,
  ApprovalActionResponse,
  ApprovalDto,
  ApprovalQueueResponse,
  ApprovalStatus,
  ApplyPolicySuggestionResponse,
  ListReleasesResponse,
  ListTasksQuery,
  ListTasksResponse,
  MetricsSummaryResponse,
  ReplayCaseResponse,
  ReleaseGateActionResponse,
  ReleaseReadinessResponse,
  ReleaseSummaryResponse,
  RunTraceResponse,
  TaskCenterTaskDto,
  ToolOutputResponse
} from "../../../../../packages/contracts/src/index.js";

export const mockDashboard: ConsoleDashboardResponse = {
  tasks: [
    {
      id: "task-f0-demo",
      projectId: "project-harness",
      goal: "验证前端 F0 Console Dashboard 闭环",
      status: "waiting_approval",
      updatedAt: "2026-07-10T00:00:00.000Z",
      traceCount: 1,
      pendingApprovalCount: 1
    }
  ],
  traces: [
    {
      traceId: "trace-f0-demo",
      taskId: "task-f0-demo",
      runId: "run-f0-demo",
      eventCount: 4,
      llmCallCount: 1,
      toolCallCount: 1,
      permissionRequestCount: 1,
      status: "running"
    }
  ],
  pendingApprovals: [
    {
      taskId: "task-f0-demo",
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      callId: "tool-call-f0",
      tool: "exec_command",
      mode: "default",
      reason: "需要执行测试验证前后端契约",
      requestedAt: "2026-07-10T00:00:00.000Z"
    }
  ]
};

const mockTasks: TaskCenterTaskDto[] = mockDashboard.tasks.map((task) => ({
  id: task.id,
  projectId: task.projectId,
  userId: "user-demo",
  goal: task.goal,
  status: task.status,
  createdAt: task.updatedAt,
  updatedAt: task.updatedAt,
  traceCount: task.traceCount,
  pendingApprovalCount: task.pendingApprovalCount,
  releaseGateStatus: "blocked",
  costUsd: 1.2
}));

const mockApproval: ApprovalDto = {
  id: "approval-run-command",
  taskId: "task-f0-demo",
  runId: "run-f0-demo",
  traceId: "trace-f0-demo",
  callId: "tool-call-f0",
  tool: "run_command",
  mode: "default",
  reason: "Tool requires approval",
  requestedAt: "2026-07-10T00:00:00.000Z",
  status: "pending",
  input: { cmd: "npm test" },
  risk: {
    level: "high",
    explanation: "Command execution is risky",
    factors: ["command"]
  },
  suggestions: [
    {
      id: "suggestion-allow-npm-test",
      title: "Allow npm test",
      description: "Allow repeated npm test commands.",
      status: "pending"
    }
  ]
};

const mockReleaseReadiness: ReleaseReadinessResponse = {
  release: {
    id: "release-console-dogfood",
    projectId: "project-harness",
    version: "2026.07.10-console",
    title: "Harness Console Dogfood",
    status: "blocked",
    generatedAt: "2026-07-10T00:02:00.000Z"
  },
  summary: "Release release-console-dogfood is blocked for project project-harness",
  checks: [
    {
      name: "eval",
      label: "Replay Eval",
      passed: false,
      detail: "case-console-approval: Output changed"
    },
    {
      name: "cost",
      label: "Cost Budget",
      passed: true,
      detail: "Cost 2.1 within budget 5"
    },
    {
      name: "quality",
      label: "Quality Trend",
      passed: false,
      detail: "Quality runs 1 below required 2"
    }
  ],
  blockers: [
    "eval: case-console-approval: Output changed",
    "quality: Quality runs 1 below required 2"
  ],
  evidence: {
    auditEventCount: 2,
    auditJsonlHref: "/api/v1/releases/release-console-dogfood/audit.jsonl",
    traceIds: ["trace-f3-demo", "trace-f4-approval"]
  }
};

const mockReleases: ListReleasesResponse = {
  releases: [
    mockReleaseReadiness.release,
    {
      id: "release-runtime-baseline",
      projectId: "project-harness",
      version: "2026.07.09-runtime",
      title: "Runtime Baseline",
      status: "ready",
      generatedAt: "2026-07-09T00:02:00.000Z"
    }
  ],
  total: 2
};

export function createMockApiClient(): ApiClient {
  return {
    async getHealth(): Promise<HealthResponse> {
      return {
        status: "ok",
        service: "harness-api"
      };
    },
    async getConsoleDashboard(): Promise<ConsoleDashboardResponse> {
      return mockDashboard;
    },
    async listTasks(query: ListTasksQuery = {}): Promise<ListTasksResponse> {
      return {
        tasks: mockTasks,
        total: mockTasks.length,
        filters: {
          status: query.status ?? "all",
          search: query.search ?? "",
          sort: query.sort ?? "updated_desc"
        }
      };
    },
    async createTask(input: CreateTaskRequest): Promise<CreateTaskResponse> {
      return {
        task: {
          id: "task-mock-created",
          projectId: input.projectId,
          userId: input.userId,
          goal: input.goal,
          status: "pending",
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
          traceCount: 0,
          pendingApprovalCount: 0,
          releaseGateStatus: "not_applicable",
          costUsd: 0
        }
      };
    },
    async listReleases(): Promise<ListReleasesResponse> {
      return mockReleases;
    },
    async getReleaseReadiness(): Promise<ReleaseReadinessResponse> {
      return mockReleaseReadiness;
    },
    async runReleaseGate(): Promise<ReleaseGateActionResponse> {
      return {
        releaseId: mockReleaseReadiness.release.id,
        status: mockReleaseReadiness.release.status,
        message: "Release release-console-dogfood gate evaluated as blocked.",
        readiness: mockReleaseReadiness
      };
    },
    async getReleaseAuditJsonl(): Promise<string> {
      return "{\"action\":\"release.gate.started\"}\n{\"action\":\"release.gate.completed\"}";
    },
    async getReleaseSummary(): Promise<ReleaseSummaryResponse> {
      return {
        ready: 0,
        blocked: 1,
        warning: 0
      };
    },
    async getMetricsSummary(): Promise<MetricsSummaryResponse> {
      return {
        activeTasks: 0,
        waitingApprovalTasks: 1,
        costTodayUsd: 1.2
      };
    },
    async getRunTrace(): Promise<RunTraceResponse> {
      return {
        taskId: "task-f0-demo",
        runId: "run-f0-demo",
        traceId: "trace-f0-demo",
        status: "running",
        events: [
          {
            id: "trace-f0-demo:1",
            sequence: 1,
            type: "permission.requested",
            timestamp: "2026-07-10T00:00:00.000Z",
            title: "Permission requested",
            summary: "需要执行测试验证前后端契约",
            severity: "warning",
            callId: "tool-call-f0",
            tool: "exec_command"
          }
        ]
      };
    },
    async getRunStreamSnapshot(): Promise<string> {
      return "event: trace.event\ndata: {\"id\":\"trace-f0-demo:1\",\"sequence\":1,\"type\":\"permission.requested\",\"timestamp\":\"2026-07-10T00:00:00.000Z\",\"title\":\"Permission requested\",\"summary\":\"需要执行测试验证前后端契约\",\"severity\":\"warning\"}\n\n";
    },
    async getToolOutput(): Promise<ToolOutputResponse> {
      return {
        ref: "tool-output://run-f0-demo/tool-call-f0",
        taskId: "task-f0-demo",
        runId: "run-f0-demo",
        callId: "tool-call-f0",
        tool: "exec_command",
        content: "ok",
        bytes: 2
      };
    },
    async getReplayCase(): Promise<ReplayCaseResponse> {
      return {
        id: "replay-trace-f0-demo",
        traceId: "trace-f0-demo",
        taskId: "task-f0-demo",
        userMessage: "Run",
        expectedOutput: "",
        expectedTools: ["exec_command"]
      };
    },
    async listApprovals(query: { status?: ApprovalStatus | "all" } = {}): Promise<ApprovalQueueResponse> {
      return {
        approvals: query.status === "all" || query.status === "approved" ? [] : [mockApproval],
        total: query.status === "all" || query.status === "approved" ? 0 : 1,
        filters: { status: query.status ?? "pending" }
      };
    },
    async approveApproval(
      approvalId: string,
      input: ApprovalActionRequest = {}
    ): Promise<ApprovalActionResponse> {
      return approvalAction(approvalId, "approved", "continues", input.reason);
    },
    async denyApproval(
      approvalId: string,
      input: ApprovalActionRequest = {}
    ): Promise<ApprovalActionResponse> {
      return approvalAction(approvalId, "denied", "failed", input.reason);
    },
    async applyPolicySuggestion(): Promise<ApplyPolicySuggestionResponse> {
      return {
        suggestion: {
          ...mockApproval.suggestions[0],
          status: "applied"
        }
      };
    }
  };
}

function approvalAction(
  approvalId: string,
  status: "approved" | "denied",
  runStatus: "continues" | "failed",
  reason?: string
): ApprovalActionResponse {
  return {
    approval: {
      ...mockApproval,
      id: approvalId,
      status,
      reason: reason ?? mockApproval.reason
    },
    runEffect: {
      runId: mockApproval.runId,
      status: runStatus,
      message: runStatus === "continues"
        ? "Approval accepted; run may continue."
        : "Approval denied; run is marked failed."
    }
  };
}
