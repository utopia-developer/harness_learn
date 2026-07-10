import test from "node:test";
import assert from "node:assert/strict";

import {
  assertProjectModelAllowed,
  createProjectScopedToolRegistry
} from "../../src/release/project-runtime.js";
import { createTeamPolicyCenter } from "../../src/team/team-policy.js";
import type { ModelClient } from "../../src/model/types.js";
import type { ToolContract } from "../../src/tools/types.js";

function tool(name: string): ToolContract {
  return {
    name,
    description: `${name} tool`,
    source: "builtin",
    inputSchema: { type: "object" },
    readOnly: true,
    destructive: false,
    permission: "auto",
    concurrency: "safe",
    outputLimitBytes: 1024,
    timeoutMs: 1000,
    execute: async () => `${name} output`
  };
}

function model(name: string): ModelClient {
  return {
    name,
    async *streamResponse() {
      yield { type: "message_completed", text: "done" };
    }
  };
}

test("createProjectScopedToolRegistry exposes only tools allowed by project policy", () => {
  const policyCenter = createTeamPolicyCenter();
  policyCenter.createTeam({ id: "team-1", name: "Platform" });
  policyCenter.createProject({
    id: "project-1",
    teamId: "team-1",
    name: "Harness",
    allowedTools: ["read_file", "search_text"],
    allowedModels: ["gpt-5-mini"]
  });

  const registry = createProjectScopedToolRegistry({
    projectId: "project-1",
    policyCenter,
    tools: [tool("read_file"), tool("run_command"), tool("search_text")]
  });

  assert.deepEqual(registry.list().map((item) => item.name), ["read_file", "search_text"]);
  assert.equal(registry.get("run_command"), undefined);
});

test("assertProjectModelAllowed accepts models allowed by project policy", () => {
  const policyCenter = createTeamPolicyCenter();
  policyCenter.createTeam({ id: "team-1", name: "Platform" });
  policyCenter.createProject({
    id: "project-1",
    teamId: "team-1",
    name: "Harness",
    allowedTools: ["read_file"],
    allowedModels: ["gpt-5-mini"]
  });

  assert.doesNotThrow(() =>
    assertProjectModelAllowed({
      projectId: "project-1",
      policyCenter,
      model: model("gpt-5-mini")
    })
  );
});

test("assertProjectModelAllowed rejects models outside project policy", () => {
  const policyCenter = createTeamPolicyCenter();
  policyCenter.createTeam({ id: "team-1", name: "Platform" });
  policyCenter.createProject({
    id: "project-1",
    teamId: "team-1",
    name: "Harness",
    allowedTools: ["read_file"],
    allowedModels: ["gpt-5-mini"]
  });

  assert.throws(
    () =>
      assertProjectModelAllowed({
        projectId: "project-1",
        policyCenter,
        model: model("gpt-5")
      }),
    /model gpt-5 is not allowed for project project-1/i
  );
});
