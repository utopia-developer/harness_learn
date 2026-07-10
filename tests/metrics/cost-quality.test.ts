import test from "node:test";
import assert from "node:assert/strict";

import { createCostQualityDashboard } from "../../src/metrics/cost-quality.js";

test("createCostQualityDashboard aggregates model and tool costs by project", () => {
  const dashboard = createCostQualityDashboard();

  dashboard.recordModelUsage({
    projectId: "project-1",
    taskId: "task-1",
    model: "gpt-5-mini",
    inputTokens: 1000,
    outputTokens: 500,
    costUsd: 0.25,
    skillId: "code-review"
  });
  dashboard.recordToolUsage({
    projectId: "project-1",
    taskId: "task-1",
    tool: "search_text",
    costUsd: 0.05,
    skillId: "code-review"
  });
  dashboard.recordModelUsage({
    projectId: "project-2",
    taskId: "task-2",
    model: "gpt-5",
    inputTokens: 2000,
    outputTokens: 1000,
    costUsd: 1.2
  });

  assert.deepEqual(dashboard.getCostSummary("project-1"), {
    projectId: "project-1",
    totalCostUsd: 0.3,
    modelCostUsd: 0.25,
    toolCostUsd: 0.05,
    byModel: { "gpt-5-mini": 0.25 },
    byTool: { search_text: 0.05 },
    bySkill: { "code-review": 0.3 }
  });
});

test("createCostQualityDashboard reports quality trend by project", () => {
  const dashboard = createCostQualityDashboard();

  dashboard.recordQualityResult({
    projectId: "project-1",
    suiteId: "release-gate",
    passed: true,
    score: 0.9,
    timestamp: "2026-07-10T00:00:00.000Z"
  });
  dashboard.recordQualityResult({
    projectId: "project-1",
    suiteId: "release-gate",
    passed: false,
    score: 0.6,
    timestamp: "2026-07-10T01:00:00.000Z"
  });

  assert.deepEqual(dashboard.getQualityTrend("project-1"), {
    projectId: "project-1",
    totalRuns: 2,
    passRate: 0.5,
    averageScore: 0.75,
    points: [
      {
        suiteId: "release-gate",
        passed: true,
        score: 0.9,
        timestamp: "2026-07-10T00:00:00.000Z"
      },
      {
        suiteId: "release-gate",
        passed: false,
        score: 0.6,
        timestamp: "2026-07-10T01:00:00.000Z"
      }
    ]
  });
});
