import type { EvalGateResult } from "../eval/replay-eval.js";
import type { CostSummary, QualityTrend } from "../metrics/cost-quality.js";

export type ReleaseGateCheckName = "eval" | "cost" | "quality";

export type ReleaseGateCheck = {
  name: ReleaseGateCheckName;
  passed: boolean;
  detail: string;
};

export type ReleaseGateThresholds = {
  maxCostUsd?: number;
  minQualityPassRate?: number;
  minAverageQualityScore?: number;
  minQualityRuns?: number;
};

export type ReleaseGateInput = {
  projectId: string;
  evalGate: EvalGateResult;
  costSummary: CostSummary;
  qualityTrend: QualityTrend;
  thresholds?: ReleaseGateThresholds;
};

export type ReleaseGateResult = {
  projectId: string;
  passed: boolean;
  checks: ReleaseGateCheck[];
};

export function runReleaseGate(input: ReleaseGateInput): ReleaseGateResult {
  const checks = [
    evaluateReplayGate(input.evalGate),
    evaluateCostGate(input.costSummary, input.thresholds),
    evaluateQualityGate(input.qualityTrend, input.thresholds)
  ];

  return {
    projectId: input.projectId,
    passed: checks.every((check) => check.passed),
    checks
  };
}

function evaluateReplayGate(evalGate: EvalGateResult): ReleaseGateCheck {
  if (evalGate.passed) {
    return {
      name: "eval",
      passed: true,
      detail: "Replay Eval Gate 已通过"
    };
  }

  const failures = evalGate.results
    .filter((result) => !result.passed)
    .map((result) => `${result.caseId}: ${result.failures.join(", ")}`);

  return {
    name: "eval",
    passed: false,
    detail: failures.join("; ")
  };
}

function evaluateCostGate(
  costSummary: CostSummary,
  thresholds: ReleaseGateThresholds | undefined
): ReleaseGateCheck {
  if (thresholds?.maxCostUsd === undefined) {
    return {
      name: "cost",
      passed: true,
      detail: "未配置成本预算"
    };
  }

  if (costSummary.totalCostUsd <= thresholds.maxCostUsd) {
    return {
      name: "cost",
      passed: true,
      detail: `成本 ${costSummary.totalCostUsd}，未超过预算 ${thresholds.maxCostUsd}`
    };
  }

  return {
    name: "cost",
    passed: false,
    detail: `成本 ${costSummary.totalCostUsd}，超过预算 ${thresholds.maxCostUsd}`
  };
}

function evaluateQualityGate(
  qualityTrend: QualityTrend,
  thresholds: ReleaseGateThresholds | undefined
): ReleaseGateCheck {
  const failures: string[] = [];
  const minQualityRuns = thresholds?.minQualityRuns;
  const minQualityPassRate = thresholds?.minQualityPassRate;
  const minAverageQualityScore = thresholds?.minAverageQualityScore;

  if (minQualityRuns !== undefined && qualityTrend.totalRuns < minQualityRuns) {
    failures.push(`质量运行次数 ${qualityTrend.totalRuns}，低于要求 ${minQualityRuns}`);
  }
  if (
    minQualityPassRate !== undefined &&
    qualityTrend.passRate < minQualityPassRate
  ) {
    failures.push(
      `通过率 ${qualityTrend.passRate}，低于要求 ${minQualityPassRate}`
    );
  }
  if (
    minAverageQualityScore !== undefined &&
    qualityTrend.averageScore < minAverageQualityScore
  ) {
    failures.push(
      `平均分 ${qualityTrend.averageScore}，低于要求 ${minAverageQualityScore}`
    );
  }

  return {
    name: "quality",
    passed: failures.length === 0,
    detail: failures.length === 0 ? "质量阈值已通过" : failures.join("; ")
  };
}
