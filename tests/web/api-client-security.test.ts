import test from "node:test";
import assert from "node:assert/strict";

import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("api client reads session and records frontend audit events with session headers", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createApiClient({
    baseUrl: "http://harness.local",
    session: {
      userId: "user-dev",
      role: "developer"
    },
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });

      if (url.endsWith("/session")) {
        return jsonResponse({
          user: {
            id: "user-dev",
            name: "Harness Developer",
            role: "developer"
          },
          permissions: {
            canEditPolicy: false,
            canApproveDangerous: true,
            canManagePlugins: false
          }
        });
      }

      return jsonResponse({
        event: {
          id: "frontend-audit-1",
          actorId: "user-dev",
          role: "developer",
          action: "approval.approve.clicked",
          target: "approval-run-command",
          route: "/approvals",
          metadata: { risk: "high" },
          recordedAt: "2026-07-10T00:00:00.000Z"
        }
      }, 201);
    }
  });

  const session = await client.getSession();
  const audit = await client.recordFrontendAudit({
    action: "approval.approve.clicked",
    target: "approval-run-command",
    route: "/approvals",
    metadata: { risk: "high" }
  });

  assert.equal(session.user.role, "developer");
  assert.equal(audit.event.actorId, "user-dev");
  assert.deepEqual(calls.map((call) => call.url), [
    "http://harness.local/api/v1/session",
    "http://harness.local/api/v1/frontend/audit-events"
  ]);
  assert.equal(calls[1].init?.method, "POST");

  for (const call of calls) {
    const headers = new Headers(call.init?.headers);
    assert.equal(headers.get("x-harness-user-id"), "user-dev");
    assert.equal(headers.get("x-harness-role"), "developer");
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
