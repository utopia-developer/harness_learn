export type ModelUsageRecord = {
  projectId: string;
  taskId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  skillId?: string;
};

export type ToolUsageRecord = {
  projectId: string;
  taskId: string;
  tool: string;
  costUsd: number;
  skillId?: string;
};

export type CostSummary = {
  projectId: string;
  totalCostUsd: number;
  modelCostUsd: number;
  toolCostUsd: number;
  byModel: Record<string, number>;
  byTool: Record<string, number>;
  bySkill: Record<string, number>;
};

export type QualityResultRecord = {
  projectId: string;
  suiteId: string;
  passed: boolean;
  score: number;
  timestamp: string;
};

export type QualityTrend = {
  projectId: string;
  totalRuns: number;
  passRate: number;
  averageScore: number;
  points: Omit<QualityResultRecord, "projectId">[];
};

export type CostQualityDashboard = {
  recordModelUsage(record: ModelUsageRecord): void;
  recordToolUsage(record: ToolUsageRecord): void;
  recordQualityResult(record: QualityResultRecord): void;
  getCostSummary(projectId: string): CostSummary;
  getQualityTrend(projectId: string): QualityTrend;
};

export function createCostQualityDashboard(): CostQualityDashboard {
  const modelUsage: ModelUsageRecord[] = [];
  const toolUsage: ToolUsageRecord[] = [];
  const qualityResults: QualityResultRecord[] = [];

  return {
    recordModelUsage(record) {
      modelUsage.push({ ...record });
    },
    recordToolUsage(record) {
      toolUsage.push({ ...record });
    },
    recordQualityResult(record) {
      qualityResults.push({ ...record });
    },
    getCostSummary(projectId) {
      const models = modelUsage.filter((record) => record.projectId === projectId);
      const tools = toolUsage.filter((record) => record.projectId === projectId);
      const byModel = sumBy(models, "model");
      const byTool = sumBy(tools, "tool");
      const bySkill: Record<string, number> = {};

      for (const record of [...models, ...tools]) {
        if (record.skillId) {
          bySkill[record.skillId] = roundMoney((bySkill[record.skillId] ?? 0) + record.costUsd);
        }
      }

      const modelCostUsd = roundMoney(models.reduce((sum, record) => sum + record.costUsd, 0));
      const toolCostUsd = roundMoney(tools.reduce((sum, record) => sum + record.costUsd, 0));

      return {
        projectId,
        totalCostUsd: roundMoney(modelCostUsd + toolCostUsd),
        modelCostUsd,
        toolCostUsd,
        byModel,
        byTool,
        bySkill
      };
    },
    getQualityTrend(projectId) {
      const points = qualityResults
        .filter((record) => record.projectId === projectId)
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
        .map(({ projectId: _projectId, ...point }) => ({ ...point }));
      const totalRuns = points.length;
      const passedRuns = points.filter((point) => point.passed).length;
      const scoreSum = points.reduce((sum, point) => sum + point.score, 0);

      return {
        projectId,
        totalRuns,
        passRate: totalRuns === 0 ? 0 : passedRuns / totalRuns,
        averageScore: totalRuns === 0 ? 0 : roundScore(scoreSum / totalRuns),
        points
      };
    }
  };
}

function sumBy<T extends { costUsd: number }>(
  records: T[],
  key: keyof T
): Record<string, number> {
  const output: Record<string, number> = {};
  for (const record of records) {
    const value = String(record[key]);
    output[value] = roundMoney((output[value] ?? 0) + record.costUsd);
  }
  return output;
}

function roundMoney(value: number): number {
  return Math.round(value * 100_000_000) / 100_000_000;
}

function roundScore(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
