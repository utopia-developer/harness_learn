import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  WEB_ROUTES,
  type ConsoleDashboardResponse,
  type MetricsCostResponse,
  type ProjectPolicyResponse,
  type ReleaseReadinessResponse,
  type TaskStatus
} from "../../packages/contracts/src/index.js";

test("contracts expose stable frontend routes and api endpoints", () => {
  assert.equal(WEB_ROUTES.tasks, "/tasks");
  assert.equal(WEB_ROUTES.approvals, "/approvals");
  assert.equal(WEB_ROUTES.releaseReadiness(":releaseId"), "/releases/:releaseId");
  assert.equal(WEB_ROUTES.metrics, "/metrics");
  assert.equal(API_ENDPOINTS.consoleDashboard, "/api/v1/console/dashboard");
  assert.equal(API_ENDPOINTS.health, "/api/v1/health");
  assert.equal(API_ENDPOINTS.releases, "/api/v1/releases");
  assert.equal(API_ENDPOINTS.releaseReadiness("release-1"), "/api/v1/releases/release-1/readiness");
  assert.equal(API_ENDPOINTS.runReleaseGate("release-1"), "/api/v1/releases/release-1/gate");
  assert.equal(API_ENDPOINTS.releaseAuditJsonl("release-1"), "/api/v1/releases/release-1/audit.jsonl");
  assert.equal(API_ENDPOINTS.projectPolicy("project-harness"), "/api/v1/projects/project-harness/policy");
  assert.equal(API_ENDPOINTS.simulateProjectPolicy("project-harness"), "/api/v1/projects/project-harness/policy/simulate");
  assert.equal(API_ENDPOINTS.teamPlugins("team-platform"), "/api/v1/teams/team-platform/plugins");
  assert.equal(API_ENDPOINTS.installTeamPlugin("team-platform", "review-pack"), "/api/v1/teams/team-platform/plugins/review-pack/install");
  assert.equal(API_ENDPOINTS.enableTeamPlugin("team-platform", "review-pack"), "/api/v1/teams/team-platform/plugins/review-pack/enable");
  assert.equal(API_ENDPOINTS.disableTeamPlugin("team-platform", "review-pack"), "/api/v1/teams/team-platform/plugins/review-pack/disable");
  assert.equal(API_ENDPOINTS.metricsCost("project-harness"), "/api/v1/metrics/cost?projectId=project-harness");
  assert.equal(API_ENDPOINTS.metricsQuality("project-harness"), "/api/v1/metrics/quality?projectId=project-harness");
  assert.equal(API_ENDPOINTS.metricsRuntime("project-harness"), "/api/v1/metrics/runtime?projectId=project-harness");
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

test("ProjectPolicyResponse models the F6 policy contract", () => {
  const response: ProjectPolicyResponse = {
    project: {
      id: "project-harness",
      teamId: "team-platform",
      name: "Harness Platform"
    },
    policy: {
      allowedTools: ["read_file", "search_text"],
      allowedModels: ["gpt-5-mini"]
    },
    availableTools: ["read_file", "search_text", "run_command"],
    availableModels: ["gpt-5", "gpt-5-mini"]
  };

  assert.equal(response.project.teamId, "team-platform");
  assert.equal(response.policy.allowedTools.includes("read_file"), true);
  assert.equal(response.availableModels.includes("gpt-5"), true);
});

test("MetricsCostResponse models the F7 cost attribution contract", () => {
  const response: MetricsCostResponse = {
    projectId: "project-harness",
    totalCostUsd: 4.25,
    modelCostUsd: 3.75,
    toolCostUsd: 0.5,
    byModel: [
      { name: "gpt-5-mini", costUsd: 2.5 }
    ],
    byTool: [
      { name: "run_command", costUsd: 0.3 }
    ],
    bySkill: [
      { name: "code-review", costUsd: 1.2 }
    ]
  };

  assert.equal(response.projectId, "project-harness");
  assert.equal(response.bySkill[0].name, "code-review");
});
