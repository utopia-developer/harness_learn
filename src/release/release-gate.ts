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
      detail: "Replay eval gate passed"
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
      detail: "No cost budget configured"
    };
  }

  if (costSummary.totalCostUsd <= thresholds.maxCostUsd) {
    return {
      name: "cost",
      passed: true,
      detail: `Cost ${costSummary.totalCostUsd} within budget ${thresholds.maxCostUsd}`
    };
  }

  return {
    name: "cost",
    passed: false,
    detail: `Cost ${costSummary.totalCostUsd} exceeds budget ${thresholds.maxCostUsd}`
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
    failures.push(`Quality runs ${qualityTrend.totalRuns} below required ${minQualityRuns}`);
  }
  if (
    minQualityPassRate !== undefined &&
    qualityTrend.passRate < minQualityPassRate
  ) {
    failures.push(
      `Pass rate ${qualityTrend.passRate} below required ${minQualityPassRate}`
    );
  }
  if (
    minAverageQualityScore !== undefined &&
    qualityTrend.averageScore < minAverageQualityScore
  ) {
    failures.push(
      `Average score ${qualityTrend.averageScore} below required ${minAverageQualityScore}`
    );
  }

  return {
    name: "quality",
    passed: failures.length === 0,
    detail: failures.length === 0 ? "Quality thresholds passed" : failures.join("; ")
  };
}
