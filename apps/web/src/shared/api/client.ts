import {
  API_ENDPOINTS,
  type ConsoleDashboardResponse
} from "../../../../../packages/contracts/src/index.js";

export type HealthResponse = {
  status: "ok";
  service: string;
};

export type ApiClient = {
  getHealth(): Promise<HealthResponse>;
  getConsoleDashboard(): Promise<ConsoleDashboardResponse>;
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
