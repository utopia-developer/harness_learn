import test from "node:test";
import assert from "node:assert/strict";

import { runReleaseGate } from "../../src/release/release-gate.js";
import type { EvalGateResult } from "../../src/eval/replay-eval.js";
import type { CostSummary, QualityTrend } from "../../src/metrics/cost-quality.js";

const passingEval: EvalGateResult = {
  passed: true,
  results: [
    {
      caseId: "case-1",
      passed: true,
      failures: []
    }
  ]
};

const costSummary: CostSummary = {
  projectId: "project-1",
  totalCostUsd: 4.25,
  modelCostUsd: 4,
  toolCostUsd: 0.25,
  byModel: { "gpt-5-mini": 4 },
  byTool: { read_file: 0.25 },
  bySkill: {}
};

const qualityTrend: QualityTrend = {
  projectId: "project-1",
  totalRuns: 3,
  passRate: 1,
  averageScore: 0.92,
  points: [
    {
      suiteId: "release",
      passed: true,
      score: 0.91,
      timestamp: "2026-07-10T00:00:00.000Z"
    },
    {
      suiteId: "release",
      passed: true,
      score: 0.92,
      timestamp: "2026-07-10T01:00:00.000Z"
    },
    {
      suiteId: "release",
      passed: true,
      score: 0.93,
      timestamp: "2026-07-10T02:00:00.000Z"
    }
  ]
};

test("runReleaseGate passes when eval, cost, and quality thresholds pass", () => {
  const result = runReleaseGate({
    projectId: "project-1",
    evalGate: passingEval,
    costSummary,
    qualityTrend,
    thresholds: {
      maxCostUsd: 5,
      minQualityPassRate: 0.9,
      minAverageQualityScore: 0.9,
      minQualityRuns: 2
    }
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.checks.map((check) => [check.name, check.passed]), [
    ["eval", true],
    ["cost", true],
    ["quality", true]
  ]);
});

test("runReleaseGate returns explicit failed checks for blocked releases", () => {
  const result = runReleaseGate({
    projectId: "project-1",
    evalGate: {
      passed: false,
      results: [
        {
          caseId: "case-1",
          passed: false,
          failures: ["Output changed", "Tool sequence changed"]
        }
      ]
    },
    costSummary: {
      ...costSummary,
      totalCostUsd: 12.5
    },
    qualityTrend: {
      ...qualityTrend,
      totalRuns: 1,
      passRate: 0,
      averageScore: 0.4
    },
    thresholds: {
      maxCostUsd: 5,
      minQualityPassRate: 0.9,
      minAverageQualityScore: 0.9,
      minQualityRuns: 2
    }
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.checks.map((check) => check.name), ["eval", "cost", "quality"]);
  assert.match(result.checks[0].detail, /case-1: Output changed, Tool sequence changed/);
  assert.match(result.checks[1].detail, /cost 12.5 exceeds budget 5/i);
  assert.match(result.checks[2].detail, /quality runs 1 below required 2/i);
  assert.match(result.checks[2].detail, /pass rate 0 below required 0.9/i);
  assert.match(result.checks[2].detail, /average score 0.4 below required 0.9/i);
});
