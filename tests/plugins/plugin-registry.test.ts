import test from "node:test";
import assert from "node:assert/strict";

import { createPluginRegistry } from "../../src/plugins/plugin-registry.js";

const pluginManifest = {
  id: "review-pack",
  name: "Review Pack",
  version: "1.0.0",
  tools: ["read_file", "search_text"],
  skills: ["code-review"]
};

test("createPluginRegistry installs and enables plugins per team", () => {
  const registry = createPluginRegistry();

  registry.install(pluginManifest);
  registry.enableForTeam("team-1", "review-pack");

  assert.equal(registry.isEnabled("team-1", "review-pack"), true);
  assert.deepEqual(registry.listEnabled("team-1").map((plugin) => plugin.id), [
    "review-pack"
  ]);
});

test("createPluginRegistry disables plugins without removing the manifest", () => {
  const registry = createPluginRegistry();

  registry.install(pluginManifest);
  registry.enableForTeam("team-1", "review-pack");
  registry.disableForTeam("team-1", "review-pack");

  assert.equal(registry.isEnabled("team-1", "review-pack"), false);
  assert.equal(registry.get("review-pack")?.version, "1.0.0");
});

test("createPluginRegistry exposes team shared skills only from enabled plugins", () => {
  const registry = createPluginRegistry();
  registry.install(pluginManifest);
  registry.install({
    id: "ops-pack",
    name: "Ops Pack",
    version: "1.0.0",
    tools: ["run_command"],
    skills: ["incident-response"]
  });

  registry.enableForTeam("team-1", "review-pack");

  assert.deepEqual(registry.listTeamSkills("team-1"), ["code-review"]);
});
