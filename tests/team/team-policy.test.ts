import test from "node:test";
import assert from "node:assert/strict";

import {
  createTeamPolicyCenter
} from "../../src/team/team-policy.js";

test("createTeamPolicyCenter manages team members and role checks", () => {
  const center = createTeamPolicyCenter();
  const team = center.createTeam({ id: "team-1", name: "Platform" });

  center.addMember(team.id, { userId: "u-admin", role: "admin" });
  center.addMember(team.id, { userId: "u-dev", role: "developer" });

  assert.equal(center.hasRole(team.id, "u-admin", "admin"), true);
  assert.equal(center.hasRole(team.id, "u-dev", "admin"), false);
});

test("project policies independently restrict tools and models", () => {
  const center = createTeamPolicyCenter();
  center.createTeam({ id: "team-1", name: "Platform" });
  const appProject = center.createProject({
    id: "project-app",
    teamId: "team-1",
    name: "App",
    allowedTools: ["read_file", "search_text"],
    allowedModels: ["gpt-5-mini"]
  });
  const opsProject = center.createProject({
    id: "project-ops",
    teamId: "team-1",
    name: "Ops",
    allowedTools: ["read_file", "run_command"],
    allowedModels: ["gpt-5", "gpt-5-mini"]
  });

  assert.equal(center.canUseTool(appProject.id, "run_command"), false);
  assert.equal(center.canUseTool(opsProject.id, "run_command"), true);
  assert.equal(center.canUseModel(appProject.id, "gpt-5"), false);
  assert.equal(center.canUseModel(opsProject.id, "gpt-5"), true);
});

test("project policies can be updated without changing other projects", () => {
  const center = createTeamPolicyCenter();
  center.createTeam({ id: "team-1", name: "Platform" });
  center.createProject({
    id: "project-a",
    teamId: "team-1",
    name: "A",
    allowedTools: ["read_file"],
    allowedModels: ["gpt-5-mini"]
  });
  center.createProject({
    id: "project-b",
    teamId: "team-1",
    name: "B",
    allowedTools: ["read_file", "write_file"],
    allowedModels: ["gpt-5-mini"]
  });

  center.updateProjectPolicy("project-a", {
    allowedTools: ["read_file", "search_text"],
    allowedModels: ["gpt-5-mini"]
  });

  assert.deepEqual(center.getProject("project-a")?.policy.allowedTools, [
    "read_file",
    "search_text"
  ]);
  assert.deepEqual(center.getProject("project-b")?.policy.allowedTools, [
    "read_file",
    "write_file"
  ]);
});
