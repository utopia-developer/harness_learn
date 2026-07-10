import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  type PluginActionResponse,
  type TeamPluginsResponse,
  type PolicySimulationResponse,
  type ProjectPolicyResponse,
  type UpdateProjectPolicyRequest
} from "../../packages/contracts/src/index.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server exposes and updates project policy", async () => {
  const before = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.projectPolicy("project-harness")
  });
  const beforeBody = before.body as ProjectPolicyResponse;

  assert.equal(before.statusCode, 200);
  assert.equal(beforeBody.project.teamId, "team-platform");
  assert.deepEqual(beforeBody.policy.allowedModels, ["gpt-5-mini"]);
  assert.equal(beforeBody.availableTools.includes("run_command"), true);

  const update: UpdateProjectPolicyRequest = {
    allowedTools: ["read_file", "search_text", "run_command"],
    allowedModels: ["gpt-5", "gpt-5-mini"]
  };
  const updated = await handleApiRequest({
    method: "PUT",
    url: API_ENDPOINTS.projectPolicy("project-harness"),
    body: update
  });
  const updatedBody = updated.body as ProjectPolicyResponse;

  assert.equal(updated.statusCode, 200);
  assert.deepEqual(updatedBody.policy.allowedTools, update.allowedTools);
  assert.deepEqual(updatedBody.policy.allowedModels, update.allowedModels);
});

test("api server simulates project policy decisions", async () => {
  const response = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.simulateProjectPolicy("project-harness"),
    body: {
      tool: "write_file",
      model: "claude-3-opus"
    }
  });
  const body = response.body as PolicySimulationResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.projectId, "project-harness");
  assert.equal(body.tool.allowed, false);
  assert.match(body.tool.reason, /not allowed/i);
  assert.equal(body.model.allowed, false);
  assert.match(body.model.reason, /not allowed/i);
});

test("api server lists plugins and shared skills for a team", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.teamPlugins("team-platform")
  });
  const body = response.body as TeamPluginsResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.teamId, "team-platform");
  assert.equal(body.plugins.length, 3);
  assert.equal(body.plugins.find((plugin) => plugin.id === "review-pack")?.enabled, true);
  assert.equal(body.plugins.find((plugin) => plugin.id === "ops-pack")?.enabled, false);
  assert.equal(body.plugins.find((plugin) => plugin.id === "research-pack")?.installed, false);
  assert.deepEqual(body.sharedSkills, ["code-review"]);
});

test("api server installs, enables and disables team plugins", async () => {
  const install = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.installTeamPlugin("team-platform", "research-pack")
  });
  const installed = install.body as PluginActionResponse;
  assert.equal(install.statusCode, 200);
  assert.equal(installed.plugin.id, "research-pack");
  assert.equal(installed.plugin.installed, true);

  const enable = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.enableTeamPlugin("team-platform", "research-pack")
  });
  const enabled = enable.body as PluginActionResponse;
  assert.equal(enable.statusCode, 200);
  assert.equal(enabled.plugin.enabled, true);
  assert.deepEqual(enabled.sharedSkills, ["code-review", "deep-research"]);

  const disable = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.disableTeamPlugin("team-platform", "research-pack")
  });
  const disabled = disable.body as PluginActionResponse;
  assert.equal(disable.statusCode, 200);
  assert.equal(disabled.plugin.enabled, false);
  assert.deepEqual(disabled.sharedSkills, ["code-review"]);
});
