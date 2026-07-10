import test from "node:test";
import assert from "node:assert/strict";

import { API_ENDPOINTS } from "../../packages/contracts/src/index.js";
import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("api client calls task center endpoints with query parameters and post body", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });

      if (url.includes(API_ENDPOINTS.tasks) && init?.method === "POST") {
        return jsonResponse({
          task: {
            id: "task-new",
            projectId: "project-harness",
            userId: "user-demo",
            goal: "创建任务",
            status: "pending",
            createdAt: "2026-07-10T00:00:00.000Z",
            updatedAt: "2026-07-10T00:00:00.000Z",
            traceCount: 0,
            pendingApprovalCount: 0,
            releaseGateStatus: "not_applicable",
            costUsd: 0
          }
        });
      }

      if (url.includes(API_ENDPOINTS.releaseSummary)) {
        return jsonResponse({ ready: 1, blocked: 1, warning: 0 });
      }

      if (url.includes(API_ENDPOINTS.metricsSummary)) {
        return jsonResponse({ activeTasks: 1, waitingApprovalTasks: 1, costTodayUsd: 2.42 });
      }

      return jsonResponse({ tasks: [], total: 0, filters: { status: "all", search: "", sort: "updated_desc" } });
    }
  });

  await client.listTasks({
    status: "running",
    search: "refresh",
    sort: "updated_asc"
  });
  await client.createTask({
    projectId: "project-harness",
    userId: "user-demo",
    goal: "创建任务"
  });
  await client.getReleaseSummary();
  await client.getMetricsSummary();

  assert.equal(
    calls[0].url,
    "http://harness.local/api/v1/tasks?status=running&search=refresh&sort=updated_asc"
  );
  assert.equal(calls[1].init?.method, "POST");
  assert.equal(calls[1].init?.body, JSON.stringify({
    projectId: "project-harness",
    userId: "user-demo",
    goal: "创建任务"
  }));
  assert.deepEqual(calls[1].init?.headers, {
    "content-type": "application/json"
  });
  assert.equal(calls[2].url, "http://harness.local/api/v1/releases/summary");
  assert.equal(calls[3].url, "http://harness.local/api/v1/metrics/summary");
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}
