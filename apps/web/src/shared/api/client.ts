import {
  API_ENDPOINTS,
  type ApprovalActionRequest,
  type ApprovalActionResponse,
  type ApprovalQueueResponse,
  type ApprovalStatus,
  type ApplyPolicySuggestionResponse,
  type ConsoleDashboardResponse,
  type CreateTaskRequest,
  type CreateTaskResponse,
  type ListReleasesResponse,
  type ListTasksQuery,
  type ListTasksResponse,
  type MetricsSummaryResponse,
  type PluginActionResponse,
  type PolicySimulationRequest,
  type PolicySimulationResponse,
  type ProjectPolicyResponse,
  type ReplayCaseResponse,
  type ReleaseGateActionResponse,
  type ReleaseReadinessResponse,
  type ReleaseSummaryResponse,
  type RunTraceResponse,
  type TeamPluginsResponse,
  type UpdateProjectPolicyRequest,
  type ToolOutputResponse
} from "../../../../../packages/contracts/src/index.js";

export type HealthResponse = {
  status: "ok";
  service: string;
};

export type ApiClient = {
  getHealth(): Promise<HealthResponse>;
  getConsoleDashboard(): Promise<ConsoleDashboardResponse>;
  listTasks(query?: ListTasksQuery): Promise<ListTasksResponse>;
  createTask(input: CreateTaskRequest): Promise<CreateTaskResponse>;
  listReleases(): Promise<ListReleasesResponse>;
  getReleaseReadiness(releaseId: string): Promise<ReleaseReadinessResponse>;
  runReleaseGate(releaseId: string): Promise<ReleaseGateActionResponse>;
  getReleaseAuditJsonl(releaseId: string): Promise<string>;
  getProjectPolicy(projectId: string): Promise<ProjectPolicyResponse>;
  updateProjectPolicy(projectId: string, input: UpdateProjectPolicyRequest): Promise<ProjectPolicyResponse>;
  simulateProjectPolicy(projectId: string, input: PolicySimulationRequest): Promise<PolicySimulationResponse>;
  listTeamPlugins(teamId: string): Promise<TeamPluginsResponse>;
  installTeamPlugin(teamId: string, pluginId: string): Promise<PluginActionResponse>;
  enableTeamPlugin(teamId: string, pluginId: string): Promise<PluginActionResponse>;
  disableTeamPlugin(teamId: string, pluginId: string): Promise<PluginActionResponse>;
  getReleaseSummary(): Promise<ReleaseSummaryResponse>;
  getMetricsSummary(): Promise<MetricsSummaryResponse>;
  getRunTrace(taskId: string, runId: string): Promise<RunTraceResponse>;
  getRunStreamSnapshot(taskId: string, runId: string): Promise<string>;
  getToolOutput(ref: string): Promise<ToolOutputResponse>;
  getReplayCase(traceId: string): Promise<ReplayCaseResponse>;
  listApprovals(query?: { status?: ApprovalStatus | "all" }): Promise<ApprovalQueueResponse>;
  approveApproval(approvalId: string, input?: ApprovalActionRequest): Promise<ApprovalActionResponse>;
  denyApproval(approvalId: string, input?: ApprovalActionRequest): Promise<ApprovalActionResponse>;
  applyPolicySuggestion(suggestionId: string): Promise<ApplyPolicySuggestionResponse>;
};

export type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
};

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const fetchImpl = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? "";

  return {
    getHealth: () => getJson<HealthResponse>(fetchImpl, baseUrl, API_ENDPOINTS.health),
    getConsoleDashboard: () =>
      getJson<ConsoleDashboardResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.consoleDashboard
      ),
    listTasks: (query) =>
      getJson<ListTasksResponse>(
        fetchImpl,
        baseUrl,
        withQuery(API_ENDPOINTS.tasks, query)
      ),
    createTask: (input) =>
      postJson<CreateTaskResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.tasks,
        input
      ),
    listReleases: () =>
      getJson<ListReleasesResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.releases
      ),
    getReleaseReadiness: (releaseId) =>
      getJson<ReleaseReadinessResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.releaseReadiness(releaseId)
      ),
    runReleaseGate: (releaseId) =>
      postJson<ReleaseGateActionResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.runReleaseGate(releaseId),
        {}
      ),
    getReleaseAuditJsonl: (releaseId) =>
      getText(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.releaseAuditJsonl(releaseId)
      ),
    getProjectPolicy: (projectId) =>
      getJson<ProjectPolicyResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.projectPolicy(projectId)
      ),
    updateProjectPolicy: (projectId, input) =>
      putJson<ProjectPolicyResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.projectPolicy(projectId),
        input
      ),
    simulateProjectPolicy: (projectId, input) =>
      postJson<PolicySimulationResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.simulateProjectPolicy(projectId),
        input
      ),
    listTeamPlugins: (teamId) =>
      getJson<TeamPluginsResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.teamPlugins(teamId)
      ),
    installTeamPlugin: (teamId, pluginId) =>
      postJson<PluginActionResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.installTeamPlugin(teamId, pluginId),
        {}
      ),
    enableTeamPlugin: (teamId, pluginId) =>
      postJson<PluginActionResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.enableTeamPlugin(teamId, pluginId),
        {}
      ),
    disableTeamPlugin: (teamId, pluginId) =>
      postJson<PluginActionResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.disableTeamPlugin(teamId, pluginId),
        {}
      ),
    getReleaseSummary: () =>
      getJson<ReleaseSummaryResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.releaseSummary
      ),
    getMetricsSummary: () =>
      getJson<MetricsSummaryResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.metricsSummary
      ),
    getRunTrace: (taskId, runId) =>
      getJson<RunTraceResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.runTrace(taskId, runId)
      ),
    getRunStreamSnapshot: (taskId, runId) =>
      getText(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.runStream(taskId, runId)
      ),
    getToolOutput: (ref) =>
      getJson<ToolOutputResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.toolOutput(ref)
      ),
    getReplayCase: (traceId) =>
      getJson<ReplayCaseResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.replayCase(traceId)
      ),
    listApprovals: (query = {}) =>
      getJson<ApprovalQueueResponse>(
        fetchImpl,
        baseUrl,
        withApprovalQuery(API_ENDPOINTS.approvals, query)
      ),
    approveApproval: (approvalId, input = {}) =>
      postJson<ApprovalActionResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.approveApproval(approvalId),
        input
      ),
    denyApproval: (approvalId, input = {}) =>
      postJson<ApprovalActionResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.denyApproval(approvalId),
        input
      ),
    applyPolicySuggestion: (suggestionId) =>
      postJson<ApplyPolicySuggestionResponse>(
        fetchImpl,
        baseUrl,
        API_ENDPOINTS.applyPolicySuggestion(suggestionId),
        {}
      )
  };
}

async function getJson<T>(
  fetchImpl: typeof fetch,
  baseUrl: string,
  endpoint: string
): Promise<T> {
  const response = await fetchImpl(`${baseUrl}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return await response.json() as T;
}

async function getText(
  fetchImpl: typeof fetch,
  baseUrl: string,
  endpoint: string
): Promise<string> {
  const response = await fetchImpl(`${baseUrl}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function postJson<T>(
  fetchImpl: typeof fetch,
  baseUrl: string,
  endpoint: string,
  body: unknown
): Promise<T> {
  const response = await fetchImpl(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return await response.json() as T;
}

async function putJson<T>(
  fetchImpl: typeof fetch,
  baseUrl: string,
  endpoint: string,
  body: unknown
): Promise<T> {
  const response = await fetchImpl(`${baseUrl}${endpoint}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return await response.json() as T;
}

function withQuery(endpoint: string, query: ListTasksQuery = {}): string {
  const params = new URLSearchParams();
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.sort) {
    params.set("sort", query.sort);
  }
  const encoded = params.toString();
  return encoded ? `${endpoint}?${encoded}` : endpoint;
}

function withApprovalQuery(
  endpoint: string,
  query: { status?: ApprovalStatus | "all" } = {}
): string {
  const params = new URLSearchParams();
  if (query.status) {
    params.set("status", query.status);
  }
  const encoded = params.toString();
  return encoded ? `${endpoint}?${encoded}` : endpoint;
}
