import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  type MetricsCostResponse,
  type MetricsQualityResponse,
  type MetricsRuntimeResponse
} from "../../packages/contracts/src/index.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server exposes cost metrics with model, tool and skill attribution", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.metricsCost("project-harness")
  });
  const body = response.body as MetricsCostResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.projectId, "project-harness");
  assert.equal(body.totalCostUsd, 4.25);
  assert.equal(body.modelCostUsd, 3.75);
  assert.equal(body.toolCostUsd, 0.5);
  assert.deepEqual(body.byModel.map((item) => item.name), ["gpt-5-mini", "gpt-5"]);
  assert.deepEqual(body.byTool.map((item) => item.name), ["run_command", "search_text"]);
  assert.deepEqual(body.bySkill.map((item) => item.name), ["code-review", "deep-research"]);
});

test("api server exposes quality metrics using release gate quality trend semantics", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.metricsQuality("project-harness")
  });
  const body = response.body as MetricsQualityResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.projectId, "project-harness");
  assert.equal(body.totalRuns, 4);
  assert.equal(body.passRate, 0.75);
  assert.equal(body.averageScore, 0.83);
  assert.deepEqual(body.points.map((point) => point.suiteId), [
    "release-gate",
    "release-gate",
    "nightly-regression",
    "nightly-regression"
  ]);
});

test("api server exposes runtime metrics for run health and approval latency", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.metricsRuntime("project-harness")
  });
  const body = response.body as MetricsRuntimeResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.projectId, "project-harness");
  assert.equal(body.totalRuns, 5);
  assert.equal(body.successRate, 0.8);
  assert.equal(body.averageIterations, 4.2);
  assert.equal(body.averageApprovalWaitMs, 90000);
  assert.deepEqual(body.byStatus, {
    completed: 4,
    failed: 1,
    cancelled: 0
  });
});
