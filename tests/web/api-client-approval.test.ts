import test from "node:test";
import assert from "node:assert/strict";

import { API_ENDPOINTS } from "../../packages/contracts/src/index.js";
import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("api client calls approval queue endpoints", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });

      if (url.includes("/approve") || url.includes("/deny")) {
        return jsonResponse({
          approval: approval("approved"),
          runEffect: {
            runId: "run-f0-demo",
            status: url.includes("/approve") ? "continues" : "failed",
            message: "ok"
          }
        });
      }
      if (url.includes("/policies/suggestions/")) {
        return jsonResponse({
          suggestion: {
            id: "suggestion-allow-npm-test",
            title: "Allow npm test",
            description: "Allow command",
            status: "applied"
          }
        });
      }
      return jsonResponse({ approvals: [approval("pending")], total: 1, filters: { status: "pending" } });
    }
  });

  await client.listApprovals({ status: "pending" });
  await client.approveApproval("approval-run-command", { reason: "Looks safe" });
  await client.denyApproval("approval-write-file", { reason: "Too risky" });
  await client.applyPolicySuggestion("suggestion-allow-npm-test");

  assert.deepEqual(calls.map((call) => call.url), [
    "http://harness.local/api/v1/approvals?status=pending",
    "http://harness.local/api/v1/approvals/approval-run-command/approve",
    "http://harness.local/api/v1/approvals/approval-write-file/deny",
    "http://harness.local/api/v1/policies/suggestions/suggestion-allow-npm-test/apply"
  ]);
  assert.equal(calls[1].init?.body, JSON.stringify({ reason: "Looks safe" }));
  assert.equal(calls[2].init?.body, JSON.stringify({ reason: "Too risky" }));
});

function approval(status: "pending" | "approved" | "denied") {
  return {
    id: "approval-run-command",
    taskId: "task-f0-demo",
    runId: "run-f0-demo",
    traceId: "trace-f0-demo",
    callId: "tool-call-f0",
    tool: "run_command",
    mode: "default",
    reason: "Tool requires approval",
    requestedAt: "2026-07-10T00:00:00.000Z",
    status,
    input: { cmd: "npm test" },
    risk: {
      level: "high",
      explanation: "Command execution is risky",
      factors: ["command"]
    },
    suggestions: []
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
