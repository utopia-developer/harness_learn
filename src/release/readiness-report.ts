import type { AuditEvent, AuditLog } from "../ops/runtime-ops.js";
import type { ReleaseGateCheck, ReleaseGateResult } from "./release-gate.js";

export type ReleaseReadinessStatus = "ready" | "blocked";

export type ReleaseReadinessEvidence = {
  auditEventCount: number;
  auditJsonl: string;
  traceIds: string[];
};

export type ReleaseReadinessReport = {
  projectId: string;
  releaseId: string;
  generatedAt: string;
  status: ReleaseReadinessStatus;
  summary: string;
  checks: ReleaseGateCheck[];
  blockers: string[];
  evidence: ReleaseReadinessEvidence;
};

export type ReleaseReadinessReportInput = {
  projectId: string;
  releaseId: string;
  generatedAt: string;
  gate: ReleaseGateResult;
  auditLog: AuditLog;
  traceIds: string[];
};

export function createReleaseReadinessReport(
  input: ReleaseReadinessReportInput
): ReleaseReadinessReport {
  if (input.gate.projectId !== input.projectId) {
    throw new Error(
      `Release gate project ${input.gate.projectId} does not match report project ${input.projectId}`
    );
  }

  const blockers = input.gate.checks
    .filter((check) => !check.passed)
    .map((check) => `${check.name}: ${check.detail}`);
  const status: ReleaseReadinessStatus = input.gate.passed ? "ready" : "blocked";
  const auditEvents = input.auditLog
    .list()
    .filter((event) => event.projectId === input.projectId);

  return {
    projectId: input.projectId,
    releaseId: input.releaseId,
    generatedAt: input.generatedAt,
    status,
    summary: buildSummary(input.releaseId, input.projectId, status),
    checks: input.gate.checks.map((check) => ({ ...check })),
    blockers,
    evidence: {
      auditEventCount: auditEvents.length,
      auditJsonl: toJsonl(auditEvents),
      traceIds: [...input.traceIds]
    }
  };
}

function buildSummary(
  releaseId: string,
  projectId: string,
  status: ReleaseReadinessStatus
): string {
  if (status === "ready") {
    return `${releaseId} 在 ${projectId} 项目中已满足发布条件`;
  }
  return `${releaseId} 在 ${projectId} 项目中仍有阻塞项`;
}

function toJsonl(events: AuditEvent[]): string {
  return events.map((event) => JSON.stringify(event)).join("\n");
}
