import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  WEB_ROUTES,
  type ConsoleDashboardResponse,
  type ReleaseReadinessResponse,
  type TaskStatus
} from "../../packages/contracts/src/index.js";

test("contracts expose stable frontend routes and api endpoints", () => {
  assert.equal(WEB_ROUTES.tasks, "/tasks");
  assert.equal(WEB_ROUTES.approvals, "/approvals");
  assert.equal(WEB_ROUTES.releaseReadiness(":releaseId"), "/releases/:releaseId");
  assert.equal(API_ENDPOINTS.consoleDashboard, "/api/v1/console/dashboard");
  assert.equal(API_ENDPOINTS.health, "/api/v1/health");
  assert.equal(API_ENDPOINTS.releases, "/api/v1/releases");
  assert.equal(API_ENDPOINTS.releaseReadiness("release-1"), "/api/v1/releases/release-1/readiness");
  assert.equal(API_ENDPOINTS.runReleaseGate("release-1"), "/api/v1/releases/release-1/gate");
  assert.equal(API_ENDPOINTS.releaseAuditJsonl("release-1"), "/api/v1/releases/release-1/audit.jsonl");
});

test("ConsoleDashboardResponse models the F0 dashboard contract", () => {
  const status: TaskStatus = "waiting_approval";
  const response: ConsoleDashboardResponse = {
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        goal: "Ship harness UI",
        status,
        updatedAt: "2026-07-10T00:00:00.000Z",
        traceCount: 1,
        pendingApprovalCount: 1
      }
    ],
    traces: [
      {
        traceId: "trace-1",
        taskId: "task-1",
        runId: "run-1",
        eventCount: 4,
        llmCallCount: 1,
        toolCallCount: 1,
        permissionRequestCount: 1,
        status: "running"
      }
    ],
    pendingApprovals: [
      {
        taskId: "task-1",
        runId: "run-1",
        traceId: "trace-1",
        callId: "call-1",
        tool: "run_command",
        mode: "default",
        reason: "Tool requires approval",
        requestedAt: "2026-07-10T00:00:00.000Z"
      }
    ]
  };

  assert.equal(response.tasks[0].status, "waiting_approval");
  assert.equal(response.pendingApprovals[0].tool, "run_command");
});

test("ReleaseReadinessResponse models the F5 readiness contract", () => {
  const response: ReleaseReadinessResponse = {
    release: {
      id: "release-2026-07-10",
      projectId: "project-harness",
      version: "2026.07.10",
      title: "Harness console dogfood",
      status: "blocked",
      generatedAt: "2026-07-10T00:00:00.000Z"
    },
    summary: "Release release-2026-07-10 is blocked for project project-harness",
    checks: [
      {
        name: "eval",
        label: "Replay Eval",
        passed: false,
        detail: "case-1: Output changed"
      }
    ],
    blockers: ["eval: case-1: Output changed"],
    evidence: {
      auditEventCount: 1,
      auditJsonlHref: "/api/v1/releases/release-2026-07-10/audit.jsonl",
      traceIds: ["trace-1"]
    }
  };

  assert.equal(response.release.status, "blocked");
  assert.equal(response.checks[0].label, "Replay Eval");
  assert.equal(response.evidence.auditJsonlHref, API_ENDPOINTS.releaseAuditJsonl("release-2026-07-10"));
});
