import test from "node:test";
import assert from "node:assert/strict";

import { createReleaseReadinessReport } from "../../src/release/readiness-report.js";
import type { ReleaseGateResult } from "../../src/release/release-gate.js";
import { createAuditLog } from "../../src/ops/runtime-ops.js";

const passedGate: ReleaseGateResult = {
  projectId: "project-1",
  passed: true,
  checks: [
    {
      name: "eval",
      passed: true,
      detail: "Replay Eval Gate 已通过"
    },
    {
      name: "cost",
      passed: true,
      detail: "成本 4.25，未超过预算 5"
    },
    {
      name: "quality",
      passed: true,
      detail: "质量阈值已通过"
    }
  ]
};

test("createReleaseReadinessReport marks a passing gate as ready with project evidence", () => {
  const auditLog = createAuditLog();
  auditLog.record({
    timestamp: "2026-07-10T00:00:00.000Z",
    actorId: "codex",
    action: "release.gate.started",
    target: "release-2026-07-10",
    projectId: "project-1"
  });
  auditLog.record({
    timestamp: "2026-07-10T00:01:00.000Z",
    actorId: "codex",
    action: "release.gate.started",
    target: "other-release",
    projectId: "project-2"
  });

  const report = createReleaseReadinessReport({
    projectId: "project-1",
    releaseId: "release-2026-07-10",
    generatedAt: "2026-07-10T00:02:00.000Z",
    gate: passedGate,
    auditLog,
    traceIds: ["trace-1", "trace-2"]
  });

  assert.equal(report.status, "ready");
  assert.equal(report.summary, "release-2026-07-10 在 project-1 项目中已满足发布条件");
  assert.equal(report.evidence.auditEventCount, 1);
  assert.match(report.evidence.auditJsonl, /release.gate.started/);
  assert.doesNotMatch(report.evidence.auditJsonl, /other-release/);
  assert.deepEqual(report.evidence.traceIds, ["trace-1", "trace-2"]);
});

test("createReleaseReadinessReport marks failed gates as blocked with reasons", () => {
  const auditLog = createAuditLog();
  const report = createReleaseReadinessReport({
    projectId: "project-1",
    releaseId: "release-2026-07-10",
    generatedAt: "2026-07-10T00:02:00.000Z",
    gate: {
      ...passedGate,
      passed: false,
      checks: [
        passedGate.checks[0],
        {
          name: "cost",
          passed: false,
          detail: "成本 12.5，超过预算 5"
        },
        {
          name: "quality",
          passed: false,
          detail: "通过率 0，低于要求 0.9"
        }
      ]
    },
    auditLog,
    traceIds: []
  });

  assert.equal(report.status, "blocked");
  assert.deepEqual(report.blockers, [
    "cost: 成本 12.5，超过预算 5",
    "quality: 通过率 0，低于要求 0.9"
  ]);
  assert.equal(report.evidence.auditEventCount, 0);
});
