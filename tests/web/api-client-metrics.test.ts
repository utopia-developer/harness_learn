import test from "node:test";
import assert from "node:assert/strict";

import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("api client calls metrics endpoints", async () => {
  const calls: string[] = [];
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push(url);

      if (url.includes("/metrics/cost")) {
        return jsonResponse(cost());
      }
      if (url.includes("/metrics/quality")) {
        return jsonResponse(quality());
      }
      return jsonResponse(runtime());
    }
  });

  await client.getMetricsCost("project-harness");
  await client.getMetricsQuality("project-harness");
  await client.getMetricsRuntime("project-harness");

  assert.deepEqual(calls, [
    "http://harness.local/api/v1/metrics/cost?projectId=project-harness",
    "http://harness.local/api/v1/metrics/quality?projectId=project-harness",
    "http://harness.local/api/v1/metrics/runtime?projectId=project-harness"
  ]);
});

function cost() {
  return {
    projectId: "project-harness",
    totalCostUsd: 4.25,
    modelCostUsd: 3.75,
    toolCostUsd: 0.5,
    byModel: [{ name: "gpt-5-mini", costUsd: 2.5 }],
    byTool: [{ name: "run_command", costUsd: 0.3 }],
    bySkill: [{ name: "code-review", costUsd: 2.8 }]
  };
}

function quality() {
  return {
    projectId: "project-harness",
    totalRuns: 4,
    passRate: 0.75,
    averageScore: 0.83,
    points: [
      {
        suiteId: "release-gate",
        passed: true,
        score: 0.91,
        timestamp: "2026-07-10T00:00:00.000Z"
      }
    ]
  };
}

function runtime() {
  return {
    projectId: "project-harness",
    totalRuns: 5,
    successRate: 0.8,
    averageIterations: 4.2,
    averageApprovalWaitMs: 90000,
    byStatus: {
      completed: 4,
      failed: 1,
      cancelled: 0
    }
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
