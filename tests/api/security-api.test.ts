import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  type FrontendAuditEventResponse,
  type ProjectPolicyResponse,
  type SessionResponse
} from "../../packages/contracts/src/index.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server exposes current session permissions from request headers", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.session,
    headers: {
      "x-harness-user-id": "user-viewer",
      "x-harness-role": "viewer"
    }
  });
  const body = response.body as SessionResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.user.id, "user-viewer");
  assert.equal(body.user.role, "viewer");
  assert.equal(body.permissions.canEditPolicy, false);
});

test("api server rejects project policy updates from non-admin roles", async () => {
  const denied = await handleApiRequest({
    method: "PUT",
    url: API_ENDPOINTS.projectPolicy("project-harness"),
    headers: {
      "x-harness-role": "viewer"
    },
    body: {
      allowedTools: ["run_command"],
      allowedModels: ["gpt-5"]
    }
  });

  const after = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.projectPolicy("project-harness")
  });
  const afterBody = after.body as ProjectPolicyResponse;

  assert.equal(denied.statusCode, 403);
  assert.deepEqual(afterBody.policy.allowedTools, ["read_file", "search_text"]);
  assert.deepEqual(afterBody.policy.allowedModels, ["gpt-5-mini"]);
});

test("api server allows admins to update project policy", async () => {
  const update = {
    allowedTools: ["read_file", "search_text", "run_command"],
    allowedModels: ["gpt-5", "gpt-5-mini"]
  };

  const updated = await handleApiRequest({
    method: "PUT",
    url: API_ENDPOINTS.projectPolicy("project-harness"),
    headers: {
      "x-harness-role": "admin"
    },
    body: update
  });
  const body = updated.body as ProjectPolicyResponse;

  assert.equal(updated.statusCode, 200);
  assert.deepEqual(body.policy.allowedTools, update.allowedTools);
  assert.deepEqual(body.policy.allowedModels, update.allowedModels);
});

test("api server records frontend audit events with actor context", async () => {
  const response = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.frontendAuditEvents,
    headers: {
      "x-harness-user-id": "user-dev",
      "x-harness-role": "developer"
    },
    body: {
      action: "approval.approve.clicked",
      target: "approval-run-command",
      route: "/approvals",
      metadata: {
        risk: "high"
      }
    }
  });
  const body = response.body as FrontendAuditEventResponse;

  assert.equal(response.statusCode, 201);
  assert.equal(body.event.actorId, "user-dev");
  assert.equal(body.event.role, "developer");
  assert.equal(body.event.action, "approval.approve.clicked");
  assert.equal(body.event.route, "/approvals");
  assert.match(body.event.id, /^frontend-audit-/);
});
