import { API_ENDPOINTS } from "../../../../../packages/contracts/src/index.js";
import type {
  TeamPluginDto,
  TeamPluginsResponse
} from "../../../../../packages/contracts/src/index.js";

export type PluginStatusViewModel = {
  label: "Enabled" | "Installed" | "Available";
  tone: "success" | "warning" | "pending";
};

export type PluginActionViewModel = {
  label: "Install" | "Enable" | "Disable";
  action: string;
  actionKind: "install" | "enable" | "disable";
};

export type PluginsViewModel = {
  teamId: string;
  sharedSkills: string[];
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    tools: string[];
    skills: string[];
    status: PluginStatusViewModel;
    primaryAction: PluginActionViewModel;
  }>;
};

export function createPluginsViewModel(input: TeamPluginsResponse): PluginsViewModel {
  return {
    teamId: input.teamId,
    sharedSkills: [...input.sharedSkills],
    plugins: input.plugins.map((plugin) => toPluginViewModel(input.teamId, plugin))
  };
}

function toPluginViewModel(
  teamId: string,
  plugin: TeamPluginDto
): PluginsViewModel["plugins"][number] {
  return {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    tools: [...plugin.tools],
    skills: [...plugin.skills],
    status: getPluginStatus(plugin),
    primaryAction: getPluginAction(teamId, plugin)
  };
}

function getPluginStatus(plugin: TeamPluginDto): PluginStatusViewModel {
  if (plugin.enabled) {
    return {
      label: "Enabled",
      tone: "success"
    };
  }
  if (plugin.installed) {
    return {
      label: "Installed",
      tone: "warning"
    };
  }
  return {
    label: "Available",
    tone: "pending"
  };
}

function getPluginAction(teamId: string, plugin: TeamPluginDto): PluginActionViewModel {
  if (!plugin.installed) {
    return {
      label: "Install",
      actionKind: "install",
      action: API_ENDPOINTS.installTeamPlugin(teamId, plugin.id)
    };
  }
  if (!plugin.enabled) {
    return {
      label: "Enable",
      actionKind: "enable",
      action: API_ENDPOINTS.enableTeamPlugin(teamId, plugin.id)
    };
  }
  return {
    label: "Disable",
    actionKind: "disable",
    action: API_ENDPOINTS.disableTeamPlugin(teamId, plugin.id)
  };
}
