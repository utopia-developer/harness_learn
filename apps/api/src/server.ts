import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";

import {
  API_ENDPOINTS,
  type ConsoleDashboardResponse,
  type CreateTaskRequest,
  type FrontendAuditEventRequest,
  type ListTasksQuery,
  type ApprovalActionRequest,
  type ApprovalStatus,
  type PolicySimulationRequest,
  type SessionResponse,
  type TaskStatus
} from "../../../packages/contracts/src/index.js";
import { createApprovalQueueStore, type ApprovalQueueStore } from "./approval-queue-store.js";
import { createDemoConsoleDashboard } from "./dashboard-fixture.js";
import { createFrontendAuditStore, type FrontendAuditStore } from "./frontend-audit-store.js";
import { createMetricsStore, type MetricsStore } from "./metrics-store.js";
import { createReleaseReadinessStore, type ReleaseReadinessStore } from "./release-readiness-store.js";
import { createRunTraceStore, type RunTraceStore } from "./run-trace-store.js";
import { createTeamGovernanceStore, type TeamGovernanceStore } from "./team-governance-store.js";
import { createTaskCenterStore, type TaskCenterStore } from "./task-center-store.js";

export type ApiServerOptions = {
  dashboard?: ConsoleDashboardResponse;
  taskCenterStore?: TaskCenterStore;
  runTraceStore?: RunTraceStore;
  approvalQueueStore?: ApprovalQueueStore;
  releaseReadinessStore?: ReleaseReadinessStore;
  teamGovernanceStore?: TeamGovernanceStore;
  metricsStore?: MetricsStore;
  frontendAuditStore?: FrontendAuditStore;
};

export type ApiRequest = {
  method?: string;
  url?: string;
  headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

export function createApiServer(options: ApiServerOptions = {}): Server {
  return createServer(async (request, response) => {
    const apiResponse = await handleApiRequest(
      {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: await readJsonBody(request)
      },
      options
    );
    sendJson(response, apiResponse);
  });
}

const defaultTaskCenterStore = createTaskCenterStore();
const defaultRunTraceStore = createRunTraceStore();
const defaultApprovalQueueStore = createApprovalQueueStore();
const defaultReleaseReadinessStore = createReleaseReadinessStore();
const defaultTeamGovernanceStore = createTeamGovernanceStore();
const defaultMetricsStore = createMetricsStore();
const defaultFrontendAuditStore = createFrontendAuditStore();

export async function handleApiRequest(
  request: ApiRequest,
  options: ApiServerOptions = {}
): Promise<ApiResponse> {
  const dashboard = options.dashboard ?? createDemoConsoleDashboard();
  const taskCenterStore = options.taskCenterStore ?? defaultTaskCenterStore;
  const runTraceStore = options.runTraceStore ?? defaultRunTraceStore;
  const approvalQueueStore = options.approvalQueueStore ?? defaultApprovalQueueStore;
  const releaseReadinessStore = options.releaseReadinessStore ?? defaultReleaseReadinessStore;
  const teamGovernanceStore = options.teamGovernanceStore ?? defaultTeamGovernanceStore;
  const metricsStore = options.metricsStore ?? defaultMetricsStore;
  const frontendAuditStore = options.frontendAuditStore ?? defaultFrontendAuditStore;
  const pathname = parsePathname(request);
  const session = parseSession(request);

  if (request.method === "GET" && pathname === API_ENDPOINTS.health) {
    return jsonResponse(200, {
      status: "ok",
      service: "harness-api"
    });
  }

  if (request.method === "GET" && pathname === API_ENDPOINTS.session) {
    return jsonResponse(200, session);
  }

  if (request.method === "POST" && pathname === API_ENDPOINTS.frontendAuditEvents) {
    return jsonResponse(201, {
      event: frontendAuditStore.record(
        {
          actorId: session.user.id,
          role: session.user.role
        },
        parseFrontendAuditEventRequest(request.body)
      )
    });
  }

  if (request.method === "GET" && pathname === API_ENDPOINTS.consoleDashboard) {
    return jsonResponse(200, dashboard);
  }

  if (request.method === "GET" && pathname === API_ENDPOINTS.tasks) {
    return jsonResponse(200, taskCenterStore.listTasks(parseTaskQuery(request)));
  }

  if (request.method === "POST" && pathname === API_ENDPOINTS.tasks) {
    return jsonResponse(201, {
      task: taskCenterStore.createTask(parseCreateTaskRequest(request.body))
    });
  }

  if (request.method === "GET" && pathname === API_ENDPOINTS.releaseSummary) {
    return jsonResponse(200, taskCenterStore.getReleaseSummary());
  }

  if (request.method === "GET" && pathname === API_ENDPOINTS.releases) {
    return jsonResponse(200, releaseReadinessStore.listReleases());
  }

  const releaseReadinessMatch = pathname.match(/^\/api\/v1\/releases\/([^/]+)\/readiness$/);
  if (request.method === "GET" && releaseReadinessMatch) {
    const readiness = releaseReadinessStore.getReadiness(
      decodeURIComponent(releaseReadinessMatch[1])
    );
    return readiness ? jsonResponse(200, readiness) : jsonResponse(404, {
      error: "not_found",
      message: "Release not found"
    });
  }

  const releaseGateMatch = pathname.match(/^\/api\/v1\/releases\/([^/]+)\/gate$/);
  if (request.method === "POST" && releaseGateMatch) {
    const result = releaseReadinessStore.runGate(decodeURIComponent(releaseGateMatch[1]));
    return result ? jsonResponse(200, result) : jsonResponse(404, {
      error: "not_found",
      message: "Release not found"
    });
  }

  const releaseAuditMatch = pathname.match(/^\/api\/v1\/releases\/([^/]+)\/audit\.jsonl$/);
  if (request.method === "GET" && releaseAuditMatch) {
    const auditJsonl = releaseReadinessStore.getAuditJsonl(
      decodeURIComponent(releaseAuditMatch[1])
    );
    return auditJsonl !== undefined
      ? textResponse(200, auditJsonl, "application/jsonl; charset=utf-8")
      : jsonResponse(404, {
        error: "not_found",
        message: "Release audit evidence not found"
      });
  }

  if (request.method === "GET" && pathname === API_ENDPOINTS.metricsSummary) {
    return jsonResponse(200, taskCenterStore.getMetricsSummary());
  }

  if (request.method === "GET" && pathname === "/api/v1/metrics/cost") {
    return jsonResponse(200, metricsStore.getCost(parseProjectId(request)));
  }

  if (request.method === "GET" && pathname === "/api/v1/metrics/quality") {
    return jsonResponse(200, metricsStore.getQuality(parseProjectId(request)));
  }

  if (request.method === "GET" && pathname === "/api/v1/metrics/runtime") {
    return jsonResponse(200, metricsStore.getRuntime(parseProjectId(request)));
  }

  const projectPolicyMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/policy$/);
  if (request.method === "GET" && projectPolicyMatch) {
    const policy = teamGovernanceStore.getProjectPolicy(
      decodeURIComponent(projectPolicyMatch[1])
    );
    return policy ? jsonResponse(200, policy) : jsonResponse(404, {
      error: "not_found",
      message: "Project policy not found"
    });
  }

  if (request.method === "PUT" && projectPolicyMatch) {
    if (!session.permissions.canEditPolicy) {
      return forbiddenResponse("Admin role required to update project policy");
    }
    const policy = teamGovernanceStore.updateProjectPolicy(
      decodeURIComponent(projectPolicyMatch[1]),
      parseProjectPolicyRequest(request.body)
    );
    return policy ? jsonResponse(200, policy) : jsonResponse(404, {
      error: "not_found",
      message: "Project policy not found"
    });
  }

  const projectPolicySimulationMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/policy\/simulate$/);
  if (request.method === "POST" && projectPolicySimulationMatch) {
    const simulation = teamGovernanceStore.simulateProjectPolicy(
      decodeURIComponent(projectPolicySimulationMatch[1]),
      parsePolicySimulationRequest(request.body)
    );
    return simulation ? jsonResponse(200, simulation) : jsonResponse(404, {
      error: "not_found",
      message: "Project policy not found"
    });
  }

  const teamPluginsMatch = pathname.match(/^\/api\/v1\/teams\/([^/]+)\/plugins$/);
  if (request.method === "GET" && teamPluginsMatch) {
    return jsonResponse(200, teamGovernanceStore.listTeamPlugins(
      decodeURIComponent(teamPluginsMatch[1])
    ));
  }

  const pluginActionMatch = pathname.match(/^\/api\/v1\/teams\/([^/]+)\/plugins\/([^/]+)\/(install|enable|disable)$/);
  if (request.method === "POST" && pluginActionMatch) {
    if (!session.permissions.canManagePlugins) {
      return forbiddenResponse("Admin role required to manage team plugins");
    }
    const teamId = decodeURIComponent(pluginActionMatch[1]);
    const pluginId = decodeURIComponent(pluginActionMatch[2]);
    const action = pluginActionMatch[3];
    const result = action === "install"
      ? teamGovernanceStore.installTeamPlugin(teamId, pluginId)
      : action === "enable"
        ? teamGovernanceStore.enableTeamPlugin(teamId, pluginId)
        : teamGovernanceStore.disableTeamPlugin(teamId, pluginId);

    return result ? jsonResponse(200, result) : jsonResponse(404, {
      error: "not_found",
      message: "Plugin not found"
    });
  }

  if (request.method === "GET" && pathname === API_ENDPOINTS.approvals) {
    return jsonResponse(200, approvalQueueStore.listApprovals(parseApprovalStatus(request)));
  }

  const approveMatch = pathname.match(/^\/api\/v1\/approvals\/([^/]+)\/approve$/);
  if (request.method === "POST" && approveMatch) {
    const result = approvalQueueStore.approve(
      decodeURIComponent(approveMatch[1]),
      parseApprovalActionRequest(request.body)
    );
    return result ? jsonResponse(200, result) : jsonResponse(404, {
      error: "not_found",
      message: "Approval not found"
    });
  }

  const denyMatch = pathname.match(/^\/api\/v1\/approvals\/([^/]+)\/deny$/);
  if (request.method === "POST" && denyMatch) {
    const result = approvalQueueStore.deny(
      decodeURIComponent(denyMatch[1]),
      parseApprovalActionRequest(request.body)
    );
    return result ? jsonResponse(200, result) : jsonResponse(404, {
      error: "not_found",
      message: "Approval not found"
    });
  }

  const applySuggestionMatch = pathname.match(/^\/api\/v1\/policies\/suggestions\/([^/]+)\/apply$/);
  if (request.method === "POST" && applySuggestionMatch) {
    const result = approvalQueueStore.applySuggestion(decodeURIComponent(applySuggestionMatch[1]));
    return result ? jsonResponse(200, result) : jsonResponse(404, {
      error: "not_found",
      message: "Policy suggestion not found"
    });
  }

  const runTraceMatch = pathname.match(/^\/api\/v1\/tasks\/([^/]+)\/runs\/([^/]+)\/trace$/);
  if (request.method === "GET" && runTraceMatch) {
    const trace = runTraceStore.getRunTrace(
      decodeURIComponent(runTraceMatch[1]),
      decodeURIComponent(runTraceMatch[2])
    );
    return trace ? jsonResponse(200, trace) : jsonResponse(404, {
      error: "not_found",
      message: "Run trace not found"
    });
  }

  const runStreamMatch = pathname.match(/^\/api\/v1\/tasks\/([^/]+)\/runs\/([^/]+)\/stream$/);
  if (request.method === "GET" && runStreamMatch) {
    const stream = runTraceStore.getRunStream(
      decodeURIComponent(runStreamMatch[1]),
      decodeURIComponent(runStreamMatch[2])
    );
    return stream ? textResponse(200, stream, "text/event-stream; charset=utf-8") : jsonResponse(404, {
      error: "not_found",
      message: "Run stream not found"
    });
  }

  const toolOutputMatch = pathname.match(/^\/api\/v1\/tool-outputs\/(.+)$/);
  if (request.method === "GET" && toolOutputMatch) {
    const output = runTraceStore.getToolOutput(decodeURIComponent(toolOutputMatch[1]));
    return output ? jsonResponse(200, output) : jsonResponse(404, {
      error: "not_found",
      message: "Tool output not found"
    });
  }

  const replayCaseMatch = pathname.match(/^\/api\/v1\/traces\/([^/]+)\/replay-case$/);
  if (request.method === "GET" && replayCaseMatch) {
    const replayCase = runTraceStore.getReplayCase(decodeURIComponent(replayCaseMatch[1]));
    return replayCase ? jsonResponse(200, replayCase) : jsonResponse(404, {
      error: "not_found",
      message: "Replay case not found"
    });
  }

  return jsonResponse(404, {
    error: "not_found",
    message: `No route for ${request.method ?? "UNKNOWN"} ${pathname}`
  });
}

function parsePathname(request: ApiRequest | IncomingMessage): string {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  return url.pathname;
}

function parseTaskQuery(request: ApiRequest): ListTasksQuery {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  return {
    status: parseStatus(url.searchParams.get("status")),
    search: url.searchParams.get("search") ?? undefined,
    sort: parseSort(url.searchParams.get("sort"))
  };
}

function parseApprovalStatus(request: ApiRequest): ApprovalStatus | "all" | undefined {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const status = url.searchParams.get("status");
  if (
    status === "pending" ||
    status === "approved" ||
    status === "denied" ||
    status === "all"
  ) {
    return status;
  }
  return undefined;
}

function parseProjectId(request: ApiRequest): string {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  return url.searchParams.get("projectId") ?? "project-harness";
}

function parseApprovalActionRequest(body: unknown): ApprovalActionRequest {
  if (!body || typeof body !== "object") {
    return {};
  }
  const input = body as Record<string, unknown>;
  return {
    ...(typeof input.reason === "string" ? { reason: input.reason } : {}),
    ...(typeof input.confirmedRisk === "boolean" ? { confirmedRisk: input.confirmedRisk } : {})
  };
}

function parseFrontendAuditEventRequest(body: unknown): FrontendAuditEventRequest {
  if (!body || typeof body !== "object") {
    return {
      action: "unknown",
      target: "unknown",
      route: "/",
      metadata: {}
    };
  }
  const input = body as Record<string, unknown>;
  return {
    action: typeof input.action === "string" ? input.action : "unknown",
    target: typeof input.target === "string" ? input.target : "unknown",
    route: typeof input.route === "string" ? input.route : "/",
    metadata: parseFrontendAuditMetadata(input.metadata)
  };
}

function parseFrontendAuditMetadata(
  metadata: unknown
): Record<string, string | number | boolean> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).filter(
      (entry): entry is [string, string | number | boolean] =>
        typeof entry[1] === "string" ||
        typeof entry[1] === "number" ||
        typeof entry[1] === "boolean"
    )
  );
}

function parseProjectPolicyRequest(body: unknown): { allowedTools: string[]; allowedModels: string[] } {
  if (!body || typeof body !== "object") {
    return {
      allowedTools: [],
      allowedModels: []
    };
  }
  const input = body as Record<string, unknown>;
  return {
    allowedTools: Array.isArray(input.allowedTools)
      ? input.allowedTools.filter((tool): tool is string => typeof tool === "string")
      : [],
    allowedModels: Array.isArray(input.allowedModels)
      ? input.allowedModels.filter((model): model is string => typeof model === "string")
      : []
  };
}

function parsePolicySimulationRequest(body: unknown): PolicySimulationRequest {
  if (!body || typeof body !== "object") {
    return {};
  }
  const input = body as Record<string, unknown>;
  return {
    tool: typeof input.tool === "string" ? input.tool : undefined,
    model: typeof input.model === "string" ? input.model : undefined
  };
}

function parseSession(request: ApiRequest): SessionResponse {
  const role = parseRole(readHeader(request, "x-harness-role"));
  const userId = readHeader(request, "x-harness-user-id") ?? "user-demo";

  return {
    user: {
      id: userId,
      name: role === "admin"
        ? "Harness Admin"
        : role === "developer"
          ? "Harness Developer"
          : "Harness Viewer",
      role
    },
    permissions: {
      canEditPolicy: role === "admin",
      canApproveDangerous: role === "admin" || role === "developer",
      canManagePlugins: role === "admin"
    }
  };
}

function parseRole(value: string | undefined): SessionResponse["user"]["role"] {
  if (value === "viewer" || value === "developer" || value === "admin") {
    return value;
  }
  return "admin";
}

function readHeader(request: ApiRequest, name: string): string | undefined {
  const headers = request.headers ?? {};
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function forbiddenResponse(message: string): ApiResponse {
  return jsonResponse(403, {
    error: "forbidden",
    message
  });
}

function parseStatus(value: string | null): TaskStatus | "all" | undefined {
  if (!value || value === "all") {
    return value === "all" ? "all" : undefined;
  }
  if (
    value === "pending" ||
    value === "planning" ||
    value === "running" ||
    value === "waiting_approval" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return undefined;
}

function parseSort(value: string | null): ListTasksQuery["sort"] {
  if (
    value === "updated_desc" ||
    value === "updated_asc" ||
    value === "status_asc" ||
    value === "goal_asc"
  ) {
    return value;
  }
  return undefined;
}

function parseCreateTaskRequest(body: unknown): CreateTaskRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Create task request body is required");
  }
  const input = body as Record<string, unknown>;
  if (
    typeof input.projectId !== "string" ||
    typeof input.userId !== "string" ||
    typeof input.goal !== "string" ||
    !input.goal.trim()
  ) {
    throw new Error("Create task request requires projectId, userId and goal");
  }
  return {
    projectId: input.projectId,
    userId: input.userId,
    goal: input.goal.trim()
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.method !== "POST" && request.method !== "PUT" && request.method !== "PATCH") {
    return undefined;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : undefined;
}

function jsonResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*"
    },
    body
  };
}

function textResponse(statusCode: number, body: string, contentType: string): ApiResponse {
  return {
    statusCode,
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*"
    },
    body
  };
}

function sendJson(response: ServerResponse, apiResponse: ApiResponse): void {
  response.writeHead(apiResponse.statusCode, apiResponse.headers);
  const contentType = apiResponse.headers["content-type"] ?? "";
  response.end(
    contentType.startsWith("application/json")
      ? JSON.stringify(apiResponse.body)
      : String(apiResponse.body)
  );
}
