import test from "node:test";
import assert from "node:assert/strict";

import { createMetricsViewModel } from "../../apps/web/src/features/metrics/metrics-view-model.js";
import type {
  MetricsCostResponse,
  MetricsQualityResponse,
  MetricsRuntimeResponse
} from "../../packages/contracts/src/index.js";

test("metrics view model exposes cost, quality and runtime summaries", () => {
  const viewModel = createMetricsViewModel({
    cost: cost(),
    quality: quality(),
    runtime: runtime()
  });

  assert.equal(viewModel.projectId, "project-harness");
  assert.equal(viewModel.summary.totalCost, "$4.25");
  assert.equal(viewModel.summary.passRate, "75%");
  assert.equal(viewModel.summary.successRate, "80%");
  assert.equal(viewModel.cost.byModel[0].label, "gpt-5-mini");
  assert.equal(viewModel.cost.byModel[0].value, "$2.50");
  assert.equal(viewModel.cost.bySkill[0].label, "code-review");
  assert.equal(viewModel.quality.points[2].tone, "danger");
  assert.equal(viewModel.runtime.averageApprovalWait, "90s");
  assert.equal(viewModel.runtime.byStatus[0].label, "已完成");
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
        suiteId: "release-gate",
        passed: true,
        score: 0.88,
        timestamp: "2026-07-10T01:00:00.000Z"
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
