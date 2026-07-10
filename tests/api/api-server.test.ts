import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  type ConsoleDashboardResponse
} from "../../packages/contracts/src/index.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server exposes health endpoint", async () => {
  const response = handleApiRequest({
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
  const response = handleApiRequest({
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
