import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  type CreateTaskRequest,
  type ConsoleDashboardResponse
} from "../../packages/contracts/src/index.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server exposes health endpoint", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.health
  });
  const body = response.body as { status: string; service: string };

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(body.status, "ok");
  assert.equal(body.service, "harness-api");
});

test("api server exposes console dashboard from backend view", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.consoleDashboard
  });
  const body = response.body as ConsoleDashboardResponse;

  assert.equal(response.statusCode, 200);
  assert.ok(body.tasks.length > 0);
  assert.ok(body.traces.length > 0);
  assert.ok(body.pendingApprovals.length > 0);
  assert.equal(body.tasks[0].status, "waiting_approval");
  assert.equal(body.tasks[0].pendingApprovalCount, 1);
});

test("api server lists, filters, searches and sorts task center records", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: `${API_ENDPOINTS.tasks}?status=waiting_approval&search=f0&sort=updated_desc`
  });

  assert.equal(response.statusCode, 200);
  const body = response.body as { tasks: Array<{ id: string; status: string; goal: string }> };
  assert.deepEqual(body.tasks.map((task) => task.id), ["task-f0-demo"]);
  assert.equal(body.tasks[0].status, "waiting_approval");
});

test("api server creates a task and returns it in the task center list", async () => {
  const request: CreateTaskRequest = {
    projectId: "project-harness",
    userId: "user-demo",
    goal: "运行 F2 任务中心验收"
  };

  const createResponse = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.tasks,
    body: request
  });
  assert.equal(createResponse.statusCode, 201);

  const listResponse = await handleApiRequest({
    method: "GET",
    url: `${API_ENDPOINTS.tasks}?search=F2`
  });
  const body = listResponse.body as { tasks: Array<{ goal: string; status: string }> };

  assert.equal(body.tasks[0].goal, "运行 F2 任务中心验收");
  assert.equal(body.tasks[0].status, "pending");
});

test("api server exposes release and metrics summaries for task health", async () => {
  const releaseResponse = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.releaseSummary
  });
  const metricsResponse = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.metricsSummary
  });

  assert.deepEqual(releaseResponse.body, {
    ready: 1,
    blocked: 1,
    warning: 0
  });
  assert.deepEqual(metricsResponse.body, {
    activeTasks: 1,
    waitingApprovalTasks: 1,
    costTodayUsd: 2.42
  });
});
