import test from "node:test";
import assert from "node:assert/strict";

import {
  createApprovalQueueViewModel,
  getApprovalRiskPresentation
} from "../../apps/web/src/features/approvals/approval-queue-view-model.js";
import type { ApprovalQueueResponse } from "../../packages/contracts/src/index.js";

test("approval queue view model exposes risk, details and action labels", () => {
  const response: ApprovalQueueResponse = {
    approvals: [
      {
        id: "approval-run-command",
        taskId: "task-f0-demo",
        runId: "run-f0-demo",
        traceId: "trace-f0-demo",
        callId: "tool-call-f0",
        tool: "run_command",
        mode: "default",
        reason: "Tool requires approval",
        requestedAt: "2026-07-10T00:00:00.000Z",
        status: "pending",
        input: { cmd: "npm test" },
        risk: {
          level: "high",
          explanation: "Command execution is risky",
          factors: ["command execution", "workspace access"]
        },
        suggestions: [
          {
            id: "suggestion-allow-npm-test",
            title: "Allow npm test",
            description: "Allow repeated npm test",
            status: "pending"
          }
        ]
      }
    ],
    total: 1,
    filters: { status: "pending" }
  };

  const viewModel = createApprovalQueueViewModel(response, "approval-run-command");

  assert.equal(viewModel.totalPending, 1);
  assert.equal(viewModel.items[0].risk.label, "High risk");
  assert.equal(viewModel.items[0].risk.tone, "danger");
  assert.equal(viewModel.selectedApproval?.inputJson, "{\n  \"cmd\": \"npm test\"\n}");
  assert.equal(viewModel.selectedApproval?.approveAction.label, "Approve");
  assert.equal(viewModel.selectedApproval?.denyAction.label, "Deny");
  assert.equal(viewModel.selectedApproval?.suggestions[0].applyAction.label, "Apply rule");
});

test("approval risk presentation maps high risk to strong visual warning", () => {
  assert.deepEqual(getApprovalRiskPresentation("high"), {
    label: "High risk",
    tone: "danger"
  });
  assert.deepEqual(getApprovalRiskPresentation("medium"), {
    label: "Medium risk",
    tone: "warning"
  });
  assert.deepEqual(getApprovalRiskPresentation("low"), {
    label: "Low risk",
    tone: "success"
  });
});
