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
      detail: "Replay eval gate passed"
    },
    {
      name: "cost",
      passed: true,
      detail: "Cost 4.25 within budget 5"
    },
    {
      name: "quality",
      passed: true,
      detail: "Quality thresholds passed"
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
  assert.equal(report.summary, "Release release-2026-07-10 is ready for project project-1");
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
          detail: "Cost 12.5 exceeds budget 5"
        },
        {
          name: "quality",
          passed: false,
          detail: "Pass rate 0 below required 0.9"
        }
      ]
    },
    auditLog,
    traceIds: []
  });

  assert.equal(report.status, "blocked");
  assert.deepEqual(report.blockers, [
    "cost: Cost 12.5 exceeds budget 5",
    "quality: Pass rate 0 below required 0.9"
  ]);
  assert.equal(report.evidence.auditEventCount, 0);
});
