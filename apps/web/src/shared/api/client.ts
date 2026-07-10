import {
  API_ENDPOINTS,
  type ConsoleDashboardResponse,
  type CreateTaskRequest,
  type CreateTaskResponse,
  type ListTasksQuery,
  type ListTasksResponse,
  type MetricsSummaryResponse,
  type ReleaseSummaryResponse
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
  getReleaseSummary(): Promise<ReleaseSummaryResponse>;
  getMetricsSummary(): Promise<MetricsSummaryResponse>;
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
