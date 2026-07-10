import test from "node:test";
import assert from "node:assert/strict";

import { createPluginsViewModel } from "../../apps/web/src/features/settings/plugins-view-model.js";
import type { TeamPluginsResponse } from "../../packages/contracts/src/index.js";

test("plugins view model exposes install state, enable actions and shared skills", () => {
  const viewModel = createPluginsViewModel(teamPlugins());

  assert.equal(viewModel.teamId, "team-platform");
  assert.deepEqual(viewModel.sharedSkills, ["code-review"]);
  assert.equal(viewModel.plugins.length, 3);
  assert.equal(viewModel.plugins[0].status.label, "Enabled");
  assert.equal(viewModel.plugins[0].primaryAction.label, "Disable");
  assert.equal(viewModel.plugins[1].status.label, "Installed");
  assert.equal(viewModel.plugins[1].primaryAction.label, "Enable");
  assert.equal(viewModel.plugins[2].status.label, "Available");
  assert.equal(viewModel.plugins[2].primaryAction.label, "Install");
  assert.equal(
    viewModel.plugins[2].primaryAction.action,
    "/api/v1/teams/team-platform/plugins/research-pack/install"
  );
});

function teamPlugins(): TeamPluginsResponse {
  return {
    teamId: "team-platform",
    plugins: [
      {
        id: "review-pack",
        name: "Review Pack",
        version: "1.0.0",
        tools: ["read_file", "search_text"],
        skills: ["code-review"],
        installed: true,
        enabled: true
      },
      {
        id: "ops-pack",
        name: "Ops Pack",
        version: "1.0.0",
        tools: ["run_command"],
        skills: ["incident-response"],
        installed: true,
        enabled: false
      },
      {
        id: "research-pack",
        name: "Research Pack",
        version: "1.0.0",
        tools: ["search_text"],
        skills: ["deep-research"],
        installed: false,
        enabled: false
      }
    ],
    sharedSkills: ["code-review"]
  };
}
