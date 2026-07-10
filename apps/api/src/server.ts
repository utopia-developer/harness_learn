import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { API_ENDPOINTS, type ConsoleDashboardResponse } from "../../../packages/contracts/src/index.js";
import { createDemoConsoleDashboard } from "./dashboard-fixture.js";

export type ApiServerOptions = {
  dashboard?: ConsoleDashboardResponse;
};

export type ApiRequest = {
  method?: string;
  url?: string;
};

export type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

export function createApiServer(options: ApiServerOptions = {}): Server {
  return createServer((request, response) => {
    const apiResponse = handleApiRequest(request, options);
    sendJson(response, apiResponse);
  });
}

export function handleApiRequest(
  request: ApiRequest,
  options: ApiServerOptions = {}
): ApiResponse {
  const dashboard = options.dashboard ?? createDemoConsoleDashboard();
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

  return jsonResponse(404, {
    error: "not_found",
    message: `No route for ${request.method ?? "UNKNOWN"} ${pathname}`
  });
}

function parsePathname(request: ApiRequest | IncomingMessage): string {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  return url.pathname;
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

function sendJson(response: ServerResponse, apiResponse: ApiResponse): void {
  response.writeHead(apiResponse.statusCode, apiResponse.headers);
  response.end(JSON.stringify(apiResponse.body));
}
