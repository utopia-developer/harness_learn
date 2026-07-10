import test from "node:test";
import assert from "node:assert/strict";

import { createPolicyViewModel } from "../../apps/web/src/features/settings/policy-view-model.js";
import type {
  PolicySimulationResponse,
  ProjectPolicyResponse
} from "../../packages/contracts/src/index.js";

test("policy view model exposes project allowlists and simulation decisions", () => {
  const viewModel = createPolicyViewModel({
    policy: projectPolicy(),
    simulation: simulation()
  });

  assert.equal(viewModel.projectName, "Harness Platform");
  assert.equal(viewModel.teamId, "team-platform");
  assert.equal(viewModel.tools[0].name, "read_file");
  assert.equal(viewModel.tools[0].allowed, true);
  assert.equal(viewModel.tools[2].name, "run_command");
  assert.equal(viewModel.tools[2].allowed, false);
  assert.equal(viewModel.models[0].name, "gpt-5");
  assert.equal(viewModel.models[0].allowed, false);
  assert.equal(viewModel.updateAction, "/api/v1/projects/project-harness/policy");
  assert.equal(viewModel.simulateAction, "/api/v1/projects/project-harness/policy/simulate");
  assert.equal(viewModel.simulation?.tool.tone, "danger");
  assert.match(viewModel.simulation?.tool.reason ?? "", /not allowed/i);
});

function projectPolicy(): ProjectPolicyResponse {
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

function simulation(): PolicySimulationResponse {
  return {
    projectId: "project-harness",
    tool: {
      name: "run_command",
      allowed: false,
      reason: "Tool run_command is not allowed by project policy."
    },
    model: {
      name: "gpt-5",
      allowed: false,
      reason: "Model gpt-5 is not allowed by project policy."
    }
  };
}
