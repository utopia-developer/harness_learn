import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import {
  API_ENDPOINTS,
  type ConsoleDashboardResponse,
  type CreateTaskRequest,
  type ListTasksQuery,
  type ApprovalActionRequest,
  type ApprovalStatus,
  type TaskStatus
} from "../../../packages/contracts/src/index.js";
import { createApprovalQueueStore, type ApprovalQueueStore } from "./approval-queue-store.js";
import { createDemoConsoleDashboard } from "./dashboard-fixture.js";
import { createRunTraceStore, type RunTraceStore } from "./run-trace-store.js";
import { createTaskCenterStore, type TaskCenterStore } from "./task-center-store.js";

export type ApiServerOptions = {
  dashboard?: ConsoleDashboardResponse;
  taskCenterStore?: TaskCenterStore;
  runTraceStore?: RunTraceStore;
  approvalQueueStore?: ApprovalQueueStore;
};

export type ApiRequest = {
  method?: string;
  url?: string;
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

export async function handleApiRequest(
  request: ApiRequest,
  options: ApiServerOptions = {}
): Promise<ApiResponse> {
  const dashboard = options.dashboard ?? createDemoConsoleDashboard();
  const taskCenterStore = options.taskCenterStore ?? defaultTaskCenterStore;
  const runTraceStore = options.runTraceStore ?? defaultRunTraceStore;
  const approvalQueueStore = options.approvalQueueStore ?? defaultApprovalQueueStore;
  const pathname = parsePathname(request);

  if (request.method === "GET" && pathname === API_ENDPOINTS.health) {
    return jsonResponse(200, {
      status: "ok",
      service: "harness-api"
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

  if (request.method === "GET" && pathname === API_ENDPOINTS.metricsSummary) {
    return jsonResponse(200, taskCenterStore.getMetricsSummary());
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

function parseApprovalActionRequest(body: unknown): ApprovalActionRequest {
  if (!body || typeof body !== "object") {
    return {};
  }
  const input = body as Record<string, unknown>;
  return typeof input.reason === "string" ? { reason: input.reason } : {};
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
