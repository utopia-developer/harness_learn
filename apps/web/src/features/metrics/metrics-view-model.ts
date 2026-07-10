import type {
  MetricsCostBreakdownItemDto,
  MetricsCostResponse,
  MetricsQualityResponse,
  MetricsRuntimeResponse
} from "../../../../../packages/contracts/src/index.js";

export type MetricsViewModel = {
  projectId: string;
  summary: {
    totalCost: string;
    passRate: string;
    successRate: string;
    averageIterations: string;
  };
  cost: {
    modelCost: string;
    toolCost: string;
    byModel: CostItemViewModel[];
    byTool: CostItemViewModel[];
    bySkill: CostItemViewModel[];
  };
  quality: {
    totalRuns: number;
    averageScore: string;
    points: Array<{
      suiteId: string;
      timestamp: string;
      score: string;
      result: "Passed" | "Failed";
      tone: "success" | "danger";
    }>;
  };
  runtime: {
    totalRuns: number;
    averageApprovalWait: string;
    byStatus: Array<{
      label: "Completed" | "Failed" | "Cancelled";
      value: number;
      tone: "success" | "danger" | "pending";
    }>;
  };
};

export type CostItemViewModel = {
  label: string;
  value: string;
  costUsd: number;
};

export function createMetricsViewModel(input: {
  cost: MetricsCostResponse;
  quality: MetricsQualityResponse;
  runtime: MetricsRuntimeResponse;
}): MetricsViewModel {
  return {
    projectId: input.cost.projectId,
    summary: {
      totalCost: formatMoney(input.cost.totalCostUsd),
      passRate: formatPercent(input.quality.passRate),
      successRate: formatPercent(input.runtime.successRate),
      averageIterations: input.runtime.averageIterations.toFixed(1)
    },
    cost: {
      modelCost: formatMoney(input.cost.modelCostUsd),
      toolCost: formatMoney(input.cost.toolCostUsd),
      byModel: input.cost.byModel.map(toCostItem),
      byTool: input.cost.byTool.map(toCostItem),
      bySkill: input.cost.bySkill.map(toCostItem)
    },
    quality: {
      totalRuns: input.quality.totalRuns,
      averageScore: input.quality.averageScore.toFixed(2),
      points: input.quality.points.map((point) => ({
        suiteId: point.suiteId,
        timestamp: point.timestamp,
        score: point.score.toFixed(2),
        result: point.passed ? "Passed" : "Failed",
        tone: point.passed ? "success" : "danger"
      }))
    },
    runtime: {
      totalRuns: input.runtime.totalRuns,
      averageApprovalWait: formatDuration(input.runtime.averageApprovalWaitMs),
      byStatus: [
        {
          label: "Completed",
          value: input.runtime.byStatus.completed,
          tone: "success"
        },
        {
          label: "Failed",
          value: input.runtime.byStatus.failed,
          tone: "danger"
        },
        {
          label: "Cancelled",
          value: input.runtime.byStatus.cancelled,
          tone: "pending"
        }
      ]
    }
  };
}

function toCostItem(item: MetricsCostBreakdownItemDto): CostItemViewModel {
  return {
    label: item.name,
    value: formatMoney(item.costUsd),
    costUsd: item.costUsd
  };
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(valueMs: number): string {
  if (valueMs < 1000) {
    return `${valueMs}ms`;
  }
  return `${Math.round(valueMs / 1000)}s`;
}
