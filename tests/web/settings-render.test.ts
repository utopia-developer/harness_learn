import test from "node:test";
import assert from "node:assert/strict";

import { renderAppHtml } from "../../apps/web/src/app/render.js";
import type {
  PolicySimulationResponse,
  ProjectPolicyResponse,
  SessionResponse,
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

  assert.match(html, /团队策略/);
  assert.match(html, /Harness Platform/);
  assert.match(html, /read_file/);
  assert.match(html, /run_command/);
  assert.match(html, /gpt-5-mini/);
  assert.match(html, /data-policy-action="update"/);
  assert.match(html, /data-policy-action="simulate"/);
  assert.match(html, /Tool run_command 不在项目策略允许范围内/);
});

test("policy settings page renders readonly controls for non-admin roles", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/settings/policy",
    session: viewerSession(),
    policySettings: {
      policy: projectPolicy()
    }
  });

  assert.match(html, /需要管理员权限才能修改项目策略/);
  assert.match(html, /name="allowedTools" value="read_file" checked disabled/);
  assert.match(html, /<button type="submit" disabled>保存策略<\/button>/);
});

test("plugins settings page renders plugin states, actions and shared skills", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/settings/plugins",
    pluginsSettings: teamPlugins()
  });

  assert.match(html, /插件注册表/);
  assert.match(html, /Review Pack/);
  assert.match(html, /Ops Pack/);
  assert.match(html, /Research Pack/);
  assert.match(html, /已启用/);
  assert.match(html, /安装/);
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

function viewerSession(): SessionResponse {
  return {
    user: {
      id: "user-viewer",
      name: "Harness Viewer",
      role: "viewer"
    },
    permissions: {
      canEditPolicy: false,
      canApproveDangerous: false,
      canManagePlugins: false
    }
  };
}

function simulation(): PolicySimulationResponse {
  return {
    projectId: "project-harness",
    tool: {
      name: "run_command",
      allowed: false,
      reason: "Tool run_command 不在项目策略允许范围内。"
    },
    model: {
      name: "gpt-5",
      allowed: false,
      reason: "Model gpt-5 不在项目策略允许范围内。"
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
