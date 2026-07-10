import test from "node:test";
import assert from "node:assert/strict";

import {
  createReleaseReadinessViewModel,
  getReleaseStatusPresentation
} from "../../apps/web/src/features/releases/release-readiness-view-model.js";
import type {
  ListReleasesResponse,
  ReleaseReadinessResponse
} from "../../packages/contracts/src/index.js";

test("release readiness view model exposes release list, checks, blockers and evidence", () => {
  const viewModel = createReleaseReadinessViewModel({
    releases: releaseList(),
    readiness: releaseReadiness()
  });

  assert.equal(viewModel.summary.totalReleases, 2);
  assert.equal(viewModel.summary.readyCount, 1);
  assert.equal(viewModel.summary.blockedCount, 1);
  assert.equal(viewModel.releases[0].href, "/releases/release-console-dogfood");
  assert.equal(viewModel.releases[0].status.label, "Blocked");
  assert.equal(viewModel.selected.releaseId, "release-console-dogfood");
  assert.equal(viewModel.selected.status.tone, "danger");
  assert.equal(viewModel.selected.checks[0].label, "Replay Eval");
  assert.equal(viewModel.selected.checks[0].status.label, "Failed");
  assert.deepEqual(viewModel.selected.blockers, [
    "eval: case-console-approval: Output changed"
  ]);
  assert.equal(viewModel.selected.evidence.auditEventCountLabel, "2 audit events");
  assert.equal(viewModel.selected.evidence.auditDownloadHref, "/api/v1/releases/release-console-dogfood/audit.jsonl");
  assert.equal(viewModel.selected.gateAction.label, "Run gate");
});

test("release status presentation distinguishes ready and blocked releases", () => {
  assert.deepEqual(getReleaseStatusPresentation("ready"), {
    label: "Ready",
    tone: "success"
  });
  assert.deepEqual(getReleaseStatusPresentation("blocked"), {
    label: "Blocked",
    tone: "danger"
  });
});

function releaseList(): ListReleasesResponse {
  return {
    releases: [
      releaseReadiness().release,
      {
        id: "release-runtime-baseline",
        projectId: "project-harness",
        version: "2026.07.09-runtime",
        title: "Runtime Baseline",
        status: "ready",
        generatedAt: "2026-07-09T00:02:00.000Z"
      }
    ],
    total: 2
  };
}

function releaseReadiness(): ReleaseReadinessResponse {
  return {
    release: {
      id: "release-console-dogfood",
      projectId: "project-harness",
      version: "2026.07.10-console",
      title: "Harness Console Dogfood",
      status: "blocked",
      generatedAt: "2026-07-10T00:02:00.000Z"
    },
    summary: "Release release-console-dogfood is blocked for project project-harness",
    checks: [
      {
        name: "eval",
        label: "Replay Eval",
        passed: false,
        detail: "case-console-approval: Output changed"
      },
      {
        name: "cost",
        label: "Cost Budget",
        passed: true,
        detail: "Cost 2.1 within budget 5"
      }
    ],
    blockers: ["eval: case-console-approval: Output changed"],
    evidence: {
      auditEventCount: 2,
      auditJsonlHref: "/api/v1/releases/release-console-dogfood/audit.jsonl",
      traceIds: ["trace-f3-demo", "trace-f4-approval"]
    }
  };
}
