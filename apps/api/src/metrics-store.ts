import type {
  MetricsCostBreakdownItemDto,
  MetricsCostResponse,
  MetricsQualityResponse,
  MetricsRuntimeResponse
} from "../../../packages/contracts/src/index.js";
import { createCostQualityDashboard, type CostQualityDashboard } from "../../../src/metrics/cost-quality.js";

export type RuntimeMetricRecord = {
  projectId: string;
  runId: string;
  status: "completed" | "failed" | "cancelled";
  iterations: number;
  approvalWaitMs: number;
};

export type MetricsStore = {
  getCost(projectId: string): MetricsCostResponse;
  getQuality(projectId: string): MetricsQualityResponse;
  getRuntime(projectId: string): MetricsRuntimeResponse;
};

export function createMetricsStore(input: {
  dashboard?: CostQualityDashboard;
  runtimeRecords?: RuntimeMetricRecord[];
} = {}): MetricsStore {
  const dashboard = input.dashboard ?? createSeedDashboard();
  const runtimeRecords = input.runtimeRecords ?? createSeedRuntimeRecords();

  return {
    getCost(projectId) {
      const summary = dashboard.getCostSummary(projectId);
      return {
        projectId: summary.projectId,
        totalCostUsd: summary.totalCostUsd,
        modelCostUsd: summary.modelCostUsd,
        toolCostUsd: summary.toolCostUsd,
        byModel: toBreakdownItems(summary.byModel),
        byTool: toBreakdownItems(summary.byTool),
        bySkill: toBreakdownItems(summary.bySkill)
      };
    },
    getQuality(projectId) {
      const trend = dashboard.getQualityTrend(projectId);
      return {
        projectId: trend.projectId,
        totalRuns: trend.totalRuns,
        passRate: trend.passRate,
        averageScore: trend.averageScore,
        points: trend.points.map((point) => ({ ...point }))
      };
    },
    getRuntime(projectId) {
      const records = runtimeRecords.filter((record) => record.projectId === projectId);
      const totalRuns = records.length;
      const completed = records.filter((record) => record.status === "completed").length;
      const failed = records.filter((record) => record.status === "failed").length;
      const cancelled = records.filter((record) => record.status === "cancelled").length;
      const iterationSum = records.reduce((sum, record) => sum + record.iterations, 0);
      const approvalWaitSum = records.reduce((sum, record) => sum + record.approvalWaitMs, 0);

      return {
        projectId,
        totalRuns,
        successRate: totalRuns === 0 ? 0 : roundRatio(completed / totalRuns),
        averageIterations: totalRuns === 0 ? 0 : roundMetric(iterationSum / totalRuns),
        averageApprovalWaitMs: totalRuns === 0 ? 0 : Math.round(approvalWaitSum / totalRuns),
        byStatus: {
          completed,
          failed,
          cancelled
        }
      };
    }
  };
}

function toBreakdownItems(record: Record<string, number>): MetricsCostBreakdownItemDto[] {
  return Object.entries(record)
    .map(([name, costUsd]) => ({ name, costUsd }))
    .sort((left, right) => right.costUsd - left.costUsd || left.name.localeCompare(right.name));
}

function createSeedDashboard(): CostQualityDashboard {
  const dashboard = createCostQualityDashboard();

  dashboard.recordModelUsage({
    projectId: "project-harness",
    taskId: "task-f0-demo",
    model: "gpt-5-mini",
    inputTokens: 8000,
    outputTokens: 2200,
    costUsd: 2.5,
    skillId: "code-review"
  });
  dashboard.recordModelUsage({
    projectId: "project-harness",
    taskId: "task-research-demo",
    model: "gpt-5",
    inputTokens: 6000,
    outputTokens: 1800,
    costUsd: 1.25,
    skillId: "deep-research"
  });
  dashboard.recordToolUsage({
    projectId: "project-harness",
    taskId: "task-f0-demo",
    tool: "run_command",
    costUsd: 0.3,
    skillId: "code-review"
  });
  dashboard.recordToolUsage({
    projectId: "project-harness",
    taskId: "task-research-demo",
    tool: "search_text",
    costUsd: 0.2,
    skillId: "deep-research"
  });
  dashboard.recordQualityResult({
    projectId: "project-harness",
    suiteId: "release-gate",
    passed: true,
    score: 0.91,
    timestamp: "2026-07-10T00:00:00.000Z"
  });
  dashboard.recordQualityResult({
    projectId: "project-harness",
    suiteId: "release-gate",
    passed: true,
    score: 0.88,
    timestamp: "2026-07-10T01:00:00.000Z"
  });
  dashboard.recordQualityResult({
    projectId: "project-harness",
    suiteId: "nightly-regression",
    passed: false,
    score: 0.65,
    timestamp: "2026-07-10T02:00:00.000Z"
  });
  dashboard.recordQualityResult({
    projectId: "project-harness",
    suiteId: "nightly-regression",
    passed: true,
    score: 0.88,
    timestamp: "2026-07-10T03:00:00.000Z"
  });

  return dashboard;
}

function createSeedRuntimeRecords(): RuntimeMetricRecord[] {
  return [
    {
      projectId: "project-harness",
      runId: "run-1",
      status: "completed",
      iterations: 4,
      approvalWaitMs: 120000
    },
    {
      projectId: "project-harness",
      runId: "run-2",
      status: "completed",
      iterations: 5,
      approvalWaitMs: 60000
    },
    {
      projectId: "project-harness",
      runId: "run-3",
      status: "completed",
      iterations: 3,
      approvalWaitMs: 90000
    },
    {
      projectId: "project-harness",
      runId: "run-4",
      status: "completed",
      iterations: 4,
      approvalWaitMs: 90000
    },
    {
      projectId: "project-harness",
      runId: "run-5",
      status: "failed",
      iterations: 5,
      approvalWaitMs: 90000
    }
  ];
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}
