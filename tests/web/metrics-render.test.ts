import test from "node:test";
import assert from "node:assert/strict";

import { renderAppHtml } from "../../apps/web/src/app/render.js";
import type {
  MetricsCostResponse,
  MetricsQualityResponse,
  MetricsRuntimeResponse
} from "../../packages/contracts/src/index.js";

test("metrics page renders cost attribution, quality trend and runtime health", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/metrics",
    metrics: {
      cost: cost(),
      quality: quality(),
      runtime: runtime()
    }
  });

  assert.match(html, /Metrics/);
  assert.match(html, /\$4\.25/);
  assert.match(html, /gpt-5-mini/);
  assert.match(html, /run_command/);
  assert.match(html, /code-review/);
  assert.match(html, /Quality trend/);
  assert.match(html, /nightly-regression/);
  assert.match(html, /Runtime health/);
  assert.match(html, /90s/);
  assert.match(html, /Completed/);
});

function cost(): MetricsCostResponse {
  return {
    projectId: "project-harness",
    totalCostUsd: 4.25,
    modelCostUsd: 3.75,
    toolCostUsd: 0.5,
    byModel: [
      { name: "gpt-5-mini", costUsd: 2.5 },
      { name: "gpt-5", costUsd: 1.25 }
    ],
    byTool: [
      { name: "run_command", costUsd: 0.3 },
      { name: "search_text", costUsd: 0.2 }
    ],
    bySkill: [
      { name: "code-review", costUsd: 2.8 },
      { name: "deep-research", costUsd: 1.45 }
    ]
  };
}

function quality(): MetricsQualityResponse {
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
      },
      {
        suiteId: "nightly-regression",
        passed: false,
        score: 0.65,
        timestamp: "2026-07-10T02:00:00.000Z"
      }
    ]
  };
}

function runtime(): MetricsRuntimeResponse {
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
