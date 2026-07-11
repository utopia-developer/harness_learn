import {
  API_ENDPOINTS,
  type ListReleasesResponse,
  type ReleaseGateActionResponse,
  type ReleaseGateCheckDto,
  type ReleaseReadinessResponse,
  type ReleaseSummaryDto
} from "../../../packages/contracts/src/index.js";
import { runReleaseGate, type ReleaseGateInput } from "../../../src/release/release-gate.js";
import { createReleaseReadinessReport } from "../../../src/release/readiness-report.js";
import { createAuditLog, type AuditLog } from "../../../src/ops/runtime-ops.js";

export type ReleaseSeed = {
  id: string;
  projectId: string;
  version: string;
  title: string;
  generatedAt: string;
  gateInput: ReleaseGateInput;
  traceIds: string[];
  auditLog: AuditLog;
};

export type ReleaseReadinessStore = {
  listReleases(): ListReleasesResponse;
  getReadiness(releaseId: string): ReleaseReadinessResponse | undefined;
  runGate(releaseId: string): ReleaseGateActionResponse | undefined;
  getAuditJsonl(releaseId: string): string | undefined;
};

export function createReleaseReadinessStore(seeds = createDefaultReleaseSeeds()): ReleaseReadinessStore {
  const releases = new Map(seeds.map((seed) => [seed.id, { ...seed }]));

  return {
    listReleases() {
      const releaseSummaries = [...releases.values()]
        .map((release) => buildReadinessResponse(release).release)
        .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));

      return {
        releases: releaseSummaries,
        total: releaseSummaries.length
      };
    },
    getReadiness(releaseId) {
      const release = releases.get(releaseId);
      return release ? buildReadinessResponse(release) : undefined;
    },
    runGate(releaseId) {
      const release = releases.get(releaseId);
      if (!release) {
        return undefined;
      }
      release.auditLog.record({
        timestamp: release.generatedAt,
        actorId: "harness-api",
        action: "release.gate.rerun",
        target: release.id,
        projectId: release.projectId
      });
      const readiness = buildReadinessResponse(release);

      return {
        releaseId,
        status: readiness.release.status,
        message: `${releaseId} 的 Gate 评估结果为${readiness.release.status === "ready" ? "就绪" : "阻塞"}。`,
        readiness
      };
    },
    getAuditJsonl(releaseId) {
      const release = releases.get(releaseId);
      if (!release) {
        return undefined;
      }
      return buildReadinessReport(release).evidence.auditJsonl;
    }
  };
}

function buildReadinessResponse(release: ReleaseSeed): ReleaseReadinessResponse {
  const report = buildReadinessReport(release);
  const releaseSummary: ReleaseSummaryDto = {
    id: release.id,
    projectId: release.projectId,
    version: release.version,
    title: release.title,
    status: report.status,
    generatedAt: report.generatedAt
  };

  return {
    release: releaseSummary,
    summary: report.summary,
    checks: report.checks.map(toCheckDto),
    blockers: [...report.blockers],
    evidence: {
      auditEventCount: report.evidence.auditEventCount,
      auditJsonlHref: API_ENDPOINTS.releaseAuditJsonl(release.id),
      traceIds: [...report.evidence.traceIds]
    }
  };
}

function buildReadinessReport(release: ReleaseSeed) {
  return createReleaseReadinessReport({
    projectId: release.projectId,
    releaseId: release.id,
    generatedAt: release.generatedAt,
    gate: runReleaseGate(release.gateInput),
    auditLog: release.auditLog,
    traceIds: release.traceIds
  });
}

function toCheckDto(check: { name: ReleaseGateCheckDto["name"]; passed: boolean; detail: string }): ReleaseGateCheckDto {
  const labels: Record<ReleaseGateCheckDto["name"], string> = {
    eval: "Replay Eval",
    cost: "成本预算",
    quality: "质量趋势"
  };

  return {
    name: check.name,
    label: labels[check.name],
    passed: check.passed,
    detail: check.detail
  };
}

function createDefaultReleaseSeeds(): ReleaseSeed[] {
  return [
    createBlockedConsoleRelease(),
    createReadyRuntimeRelease()
  ];
}

function createBlockedConsoleRelease(): ReleaseSeed {
  const auditLog = createAuditLog();
  auditLog.record({
    timestamp: "2026-07-10T00:00:00.000Z",
    actorId: "codex",
    action: "release.gate.started",
    target: "release-console-dogfood",
    projectId: "project-harness"
  });
  auditLog.record({
    timestamp: "2026-07-10T00:01:00.000Z",
    actorId: "codex",
    action: "release.gate.completed",
    target: "release-console-dogfood",
    projectId: "project-harness"
  });

  return {
    id: "release-console-dogfood",
    projectId: "project-harness",
    version: "2026.07.10-console",
    title: "Harness Console Dogfood",
    generatedAt: "2026-07-10T00:02:00.000Z",
    traceIds: ["trace-f3-demo", "trace-f4-approval"],
    auditLog,
    gateInput: {
      projectId: "project-harness",
      evalGate: {
        passed: false,
        results: [
          {
            caseId: "case-console-approval",
            passed: false,
            failures: ["输出发生变化"]
          }
        ]
      },
      costSummary: {
        projectId: "project-harness",
        totalCostUsd: 7.5,
        modelCostUsd: 7,
        toolCostUsd: 0.5,
        byModel: { "gpt-5-mini": 7 },
        byTool: { run_command: 0.5 },
        bySkill: {}
      },
      qualityTrend: {
        projectId: "project-harness",
        totalRuns: 1,
        passRate: 0,
        averageScore: 0.42,
        points: [
          {
            suiteId: "console-release",
            passed: false,
            score: 0.42,
            timestamp: "2026-07-10T00:00:00.000Z"
          }
        ]
      },
      thresholds: {
        maxCostUsd: 5,
        minQualityPassRate: 0.9,
        minAverageQualityScore: 0.85,
        minQualityRuns: 2
      }
    }
  };
}

function createReadyRuntimeRelease(): ReleaseSeed {
  const auditLog = createAuditLog();
  auditLog.record({
    timestamp: "2026-07-09T00:00:00.000Z",
    actorId: "codex",
    action: "release.gate.started",
    target: "release-runtime-baseline",
    projectId: "project-harness"
  });
  auditLog.record({
    timestamp: "2026-07-09T00:01:00.000Z",
    actorId: "codex",
    action: "release.gate.completed",
    target: "release-runtime-baseline",
    projectId: "project-harness"
  });

  return {
    id: "release-runtime-baseline",
    projectId: "project-harness",
    version: "2026.07.09-runtime",
    title: "Runtime Baseline",
    generatedAt: "2026-07-09T00:02:00.000Z",
    traceIds: ["trace-runtime-baseline"],
    auditLog,
    gateInput: {
      projectId: "project-harness",
      evalGate: {
        passed: true,
        results: [
          {
            caseId: "case-runtime-loop",
            passed: true,
            failures: []
          }
        ]
      },
      costSummary: {
        projectId: "project-harness",
        totalCostUsd: 2.1,
        modelCostUsd: 2,
        toolCostUsd: 0.1,
        byModel: { "gpt-5-mini": 2 },
        byTool: { read_file: 0.1 },
        bySkill: {}
      },
      qualityTrend: {
        projectId: "project-harness",
        totalRuns: 3,
        passRate: 1,
        averageScore: 0.93,
        points: [
          {
            suiteId: "runtime-release",
            passed: true,
            score: 0.91,
            timestamp: "2026-07-09T00:00:00.000Z"
          },
          {
            suiteId: "runtime-release",
            passed: true,
            score: 0.94,
            timestamp: "2026-07-09T00:01:00.000Z"
          },
          {
            suiteId: "runtime-release",
            passed: true,
            score: 0.95,
            timestamp: "2026-07-09T00:02:00.000Z"
          }
        ]
      },
      thresholds: {
        maxCostUsd: 5,
        minQualityPassRate: 0.9,
        minAverageQualityScore: 0.85,
        minQualityRuns: 2
      }
    }
  };
}
