import test from "node:test";
import assert from "node:assert/strict";

import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("api client calls policy and plugin governance endpoints", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });

      if (url.endsWith("/policy/simulate")) {
        return jsonResponse({
          projectId: "project-harness",
          tool: { name: "run_command", allowed: false, reason: "Tool not allowed" },
          model: { name: "gpt-5", allowed: false, reason: "Model not allowed" }
        });
      }
      if (url.endsWith("/policy")) {
        return jsonResponse(policyResponse());
      }
      if (url.endsWith("/install") || url.endsWith("/enable") || url.endsWith("/disable")) {
        return jsonResponse({
          teamId: "team-platform",
          plugin: plugin("review-pack", true, true),
          sharedSkills: ["code-review"],
          message: "ok"
        });
      }
      return jsonResponse({
        teamId: "team-platform",
        plugins: [plugin("review-pack", true, true)],
        sharedSkills: ["code-review"]
      });
    }
  });

  await client.getProjectPolicy("project-harness");
  await client.updateProjectPolicy("project-harness", {
    allowedTools: ["read_file", "search_text"],
    allowedModels: ["gpt-5-mini"]
  });
  await client.simulateProjectPolicy("project-harness", {
    tool: "run_command",
    model: "gpt-5"
  });
  await client.listTeamPlugins("team-platform");
  await client.installTeamPlugin("team-platform", "research-pack");
  await client.enableTeamPlugin("team-platform", "review-pack");
  await client.disableTeamPlugin("team-platform", "ops-pack");

  assert.deepEqual(calls.map((call) => call.url), [
    "http://harness.local/api/v1/projects/project-harness/policy",
    "http://harness.local/api/v1/projects/project-harness/policy",
    "http://harness.local/api/v1/projects/project-harness/policy/simulate",
    "http://harness.local/api/v1/teams/team-platform/plugins",
    "http://harness.local/api/v1/teams/team-platform/plugins/research-pack/install",
    "http://harness.local/api/v1/teams/team-platform/plugins/review-pack/enable",
    "http://harness.local/api/v1/teams/team-platform/plugins/ops-pack/disable"
  ]);
  assert.equal(calls[1].init?.method, "PUT");
  assert.equal(calls[2].init?.method, "POST");
  assert.equal(calls[4].init?.method, "POST");
  assert.equal(calls[1].init?.body, JSON.stringify({
    allowedTools: ["read_file", "search_text"],
    allowedModels: ["gpt-5-mini"]
  }));
});

function policyResponse() {
  return {
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
}

function plugin(id: string, installed: boolean, enabled: boolean) {
  return {
    id,
    name: "Review Pack",
    version: "1.0.0",
    tools: ["read_file"],
    skills: ["code-review"],
    installed,
    enabled
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
