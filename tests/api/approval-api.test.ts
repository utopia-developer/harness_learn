import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  type ApprovalQueueResponse,
  type ApprovalActionResponse
} from "../../packages/contracts/src/index.js";
import { createApprovalQueueStore } from "../../apps/api/src/approval-queue-store.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server lists pending approvals with risk explanation and suggestions", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: `${API_ENDPOINTS.approvals}?status=pending`
  }, {
    approvalQueueStore: createApprovalQueueStore()
  });

  assert.equal(response.statusCode, 200);
  const body = response.body as ApprovalQueueResponse;

  assert.equal(body.approvals.length, 2);
  assert.equal(body.approvals[0].status, "pending");
  assert.equal(body.approvals[0].risk.level, "high");
  assert.match(body.approvals[0].risk.explanation, /Shell 命令/);
  assert.equal(body.approvals[0].suggestions[0].status, "pending");
});

test("api server approves an approval and removes it from pending queue", async () => {
  const approvalQueueStore = createApprovalQueueStore();

  const approveResponse = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.approveApproval("approval-run-command"),
    body: {
      reason: "Reviewed command",
      confirmedRisk: true
    }
  }, { approvalQueueStore });
  const approved = approveResponse.body as ApprovalActionResponse;

  assert.equal(approveResponse.statusCode, 200);
  assert.equal(approved.approval.status, "approved");
  assert.equal(approved.runEffect.status, "continues");

  const listResponse = await handleApiRequest({
    method: "GET",
    url: `${API_ENDPOINTS.approvals}?status=pending`
  }, { approvalQueueStore });
  const list = listResponse.body as ApprovalQueueResponse;
  assert.deepEqual(list.approvals.map((approval) => approval.id), ["approval-write-file"]);
});

test("api server requires explicit confirmation before approving high risk approvals", async () => {
  const approvalQueueStore = createApprovalQueueStore();

  const response = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.approveApproval("approval-run-command"),
    body: { reason: "Reviewed command" }
  }, { approvalQueueStore });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: "confirmation_required",
    message: "高风险审批需要显式确认"
  });
});

test("api server denies an approval and marks related run as failed", async () => {
  const approvalQueueStore = createApprovalQueueStore();

  const denyResponse = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.denyApproval("approval-write-file"),
    body: { reason: "Do not edit files" }
  }, { approvalQueueStore });
  const denied = denyResponse.body as ApprovalActionResponse;

  assert.equal(denyResponse.statusCode, 200);
  assert.equal(denied.approval.status, "denied");
  assert.equal(denied.runEffect.status, "failed");
});

test("api server applies a policy suggestion", async () => {
  const approvalQueueStore = createApprovalQueueStore();

  const response = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.applyPolicySuggestion("suggestion-allow-npm-test")
  }, { approvalQueueStore });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    suggestion: {
      id: "suggestion-allow-npm-test",
      title: "允许在 project-harness 中执行 npm test",
      description: "人工审批后允许重复执行 npm test 命令。",
      status: "applied"
    }
  });
});
