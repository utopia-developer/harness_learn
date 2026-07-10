export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  tools: string[];
  skills: string[];
};

export type PluginRegistry = {
  install(manifest: PluginManifest): PluginManifest;
  get(pluginId: string): PluginManifest | undefined;
  enableForTeam(teamId: string, pluginId: string): void;
  disableForTeam(teamId: string, pluginId: string): void;
  isEnabled(teamId: string, pluginId: string): boolean;
  listEnabled(teamId: string): PluginManifest[];
  listTeamSkills(teamId: string): string[];
};

export function createPluginRegistry(): PluginRegistry {
  const manifests = new Map<string, PluginManifest>();
  const enabledByTeam = new Map<string, Set<string>>();

  return {
    install(manifest) {
      const stored = cloneManifest(manifest);
      manifests.set(stored.id, stored);
      return cloneManifest(stored);
    },
    get(pluginId) {
      const manifest = manifests.get(pluginId);
      return manifest ? cloneManifest(manifest) : undefined;
    },
    enableForTeam(teamId, pluginId) {
      requirePlugin(manifests, pluginId);
      const enabled = enabledByTeam.get(teamId) ?? new Set<string>();
      enabled.add(pluginId);
      enabledByTeam.set(teamId, enabled);
    },
    disableForTeam(teamId, pluginId) {
      const enabled = enabledByTeam.get(teamId);
      enabled?.delete(pluginId);
    },
    isEnabled(teamId, pluginId) {
      return enabledByTeam.get(teamId)?.has(pluginId) ?? false;
    },
    listEnabled(teamId) {
      return [...(enabledByTeam.get(teamId) ?? new Set<string>())]
        .map((pluginId) => manifests.get(pluginId))
        .filter((manifest): manifest is PluginManifest => Boolean(manifest))
        .map(cloneManifest);
    },
    listTeamSkills(teamId) {
      return this.listEnabled(teamId).flatMap((manifest) => manifest.skills);
    }
  };
}

function requirePlugin(
  manifests: Map<string, PluginManifest>,
  pluginId: string
): PluginManifest {
  const manifest = manifests.get(pluginId);
  if (!manifest) {
    throw new Error(`Plugin not installed: ${pluginId}`);
  }
  return manifest;
}

function cloneManifest(manifest: PluginManifest): PluginManifest {
  return {
    ...manifest,
    tools: [...manifest.tools],
    skills: [...manifest.skills]
  };
}
