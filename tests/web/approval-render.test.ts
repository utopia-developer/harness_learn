import test from "node:test";
import assert from "node:assert/strict";

import { renderAppHtml } from "../../apps/web/src/app/render.js";
import type { ApprovalQueueResponse } from "../../packages/contracts/src/index.js";

test("approvals page renders queue, detail, risk and policy suggestions", () => {
  const approvalQueue: ApprovalQueueResponse = {
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

  const html = renderAppHtml({
    state: "ready",
    pathname: "/approvals",
    approvalQueue
  });

  assert.match(html, /Approval Queue/);
  assert.match(html, /run_command/);
  assert.match(html, /High risk/);
  assert.match(html, /Command execution is risky/);
  assert.match(html, /npm test/);
  assert.match(html, /name="reason"/);
  assert.match(html, /approval-run-command\/approve/);
  assert.match(html, /approval-run-command\/deny/);
  assert.match(html, /suggestion-allow-npm-test\/apply/);
});
