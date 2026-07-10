import test from "node:test";
import assert from "node:assert/strict";

import { renderAppHtml } from "../../apps/web/src/app/render.js";
import type {
  PolicySimulationResponse,
  ProjectPolicyResponse,
  TeamPluginsResponse
} from "../../packages/contracts/src/index.js";

test("policy settings page renders allowlists and simulator actions", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/settings/policy",
    policySettings: {
      policy: projectPolicy(),
      simulation: simulation()
    }
  });

  assert.match(html, /Team Policy/);
  assert.match(html, /Harness Platform/);
  assert.match(html, /read_file/);
  assert.match(html, /run_command/);
  assert.match(html, /gpt-5-mini/);
  assert.match(html, /data-policy-action="update"/);
  assert.match(html, /data-policy-action="simulate"/);
  assert.match(html, /Tool run_command is not allowed/);
});

test("plugins settings page renders plugin states, actions and shared skills", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/settings/plugins",
    pluginsSettings: teamPlugins()
  });

  assert.match(html, /Plugin Registry/);
  assert.match(html, /Review Pack/);
  assert.match(html, /Ops Pack/);
  assert.match(html, /Research Pack/);
  assert.match(html, /Enabled/);
  assert.match(html, /Install/);
  assert.match(html, /code-review/);
  assert.match(html, /data-plugin-action="install"/);
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
