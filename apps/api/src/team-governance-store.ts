import type {
  PluginActionResponse,
  PolicySimulationRequest,
  PolicySimulationResponse,
  ProjectPolicyDto,
  ProjectPolicyResponse,
  TeamPluginDto,
  TeamPluginsResponse
} from "../../../packages/contracts/src/index.js";
import { createPluginRegistry, type PluginManifest, type PluginRegistry } from "../../../src/plugins/plugin-registry.js";
import { createTeamPolicyCenter, type Project, type TeamPolicyCenter } from "../../../src/team/team-policy.js";

export type TeamGovernanceStore = {
  getProjectPolicy(projectId: string): ProjectPolicyResponse | undefined;
  updateProjectPolicy(projectId: string, policy: ProjectPolicyDto): ProjectPolicyResponse | undefined;
  simulateProjectPolicy(projectId: string, request: PolicySimulationRequest): PolicySimulationResponse | undefined;
  listTeamPlugins(teamId: string): TeamPluginsResponse;
  installTeamPlugin(teamId: string, pluginId: string): PluginActionResponse | undefined;
  enableTeamPlugin(teamId: string, pluginId: string): PluginActionResponse | undefined;
  disableTeamPlugin(teamId: string, pluginId: string): PluginActionResponse | undefined;
};

export function createTeamGovernanceStore(input: {
  policyCenter?: TeamPolicyCenter;
  pluginRegistry?: PluginRegistry;
  pluginCatalog?: PluginManifest[];
} = {}): TeamGovernanceStore {
  const policyCenter = input.policyCenter ?? createSeedPolicyCenter();
  const pluginRegistry = input.pluginRegistry ?? createSeedPluginRegistry();
  const pluginCatalog = input.pluginCatalog ?? createPluginCatalog();

  return {
    getProjectPolicy(projectId) {
      const project = policyCenter.getProject(projectId);
      return project ? toPolicyResponse(project) : undefined;
    },
    updateProjectPolicy(projectId, policy) {
      const project = policyCenter.getProject(projectId);
      if (!project) {
        return undefined;
      }
      return toPolicyResponse(policyCenter.updateProjectPolicy(projectId, policy));
    },
    simulateProjectPolicy(projectId, request) {
      if (!policyCenter.getProject(projectId)) {
        return undefined;
      }
      const tool = request.tool ?? "";
      const model = request.model ?? "";
      const toolAllowed = tool ? policyCenter.canUseTool(projectId, tool) : false;
      const modelAllowed = model ? policyCenter.canUseModel(projectId, model) : false;

      return {
        projectId,
        tool: {
          name: tool,
          allowed: toolAllowed,
          reason: toolAllowed
            ? `Tool ${tool} is allowed by project policy.`
            : `Tool ${tool} is not allowed by project policy.`
        },
        model: {
          name: model,
          allowed: modelAllowed,
          reason: modelAllowed
            ? `Model ${model} is allowed by project policy.`
            : `Model ${model} is not allowed by project policy.`
        }
      };
    },
    listTeamPlugins(teamId) {
      return toTeamPluginsResponse(teamId, pluginRegistry, pluginCatalog);
    },
    installTeamPlugin(teamId, pluginId) {
      const manifest = pluginCatalog.find((plugin) => plugin.id === pluginId);
      if (!manifest) {
        return undefined;
      }
      pluginRegistry.install(manifest);
      return {
        teamId,
        plugin: toPluginDto(teamId, manifest, pluginRegistry),
        sharedSkills: pluginRegistry.listTeamSkills(teamId),
        message: `Plugin ${pluginId} installed.`
      };
    },
    enableTeamPlugin(teamId, pluginId) {
      const manifest = pluginRegistry.get(pluginId);
      if (!manifest) {
        return undefined;
      }
      pluginRegistry.enableForTeam(teamId, pluginId);
      return {
        teamId,
        plugin: toPluginDto(teamId, manifest, pluginRegistry),
        sharedSkills: pluginRegistry.listTeamSkills(teamId),
        message: `Plugin ${pluginId} enabled.`
      };
    },
    disableTeamPlugin(teamId, pluginId) {
      const manifest = pluginRegistry.get(pluginId);
      if (!manifest) {
        return undefined;
      }
      pluginRegistry.disableForTeam(teamId, pluginId);
      return {
        teamId,
        plugin: toPluginDto(teamId, manifest, pluginRegistry),
        sharedSkills: pluginRegistry.listTeamSkills(teamId),
        message: `Plugin ${pluginId} disabled.`
      };
    }
  };
}

const availableTools = ["read_file", "search_text", "run_command", "write_file"];
const availableModels = ["gpt-5", "gpt-5-mini", "claude-3-opus"];

function toPolicyResponse(project: Project): ProjectPolicyResponse {
  return {
    project: {
      id: project.id,
      teamId: project.teamId,
      name: project.name
    },
    policy: {
      allowedTools: [...project.policy.allowedTools],
      allowedModels: [...project.policy.allowedModels]
    },
    availableTools: [...availableTools],
    availableModels: [...availableModels]
  };
}

function toTeamPluginsResponse(
  teamId: string,
  pluginRegistry: PluginRegistry,
  pluginCatalog: PluginManifest[]
): TeamPluginsResponse {
  return {
    teamId,
    plugins: pluginCatalog.map((manifest) => toPluginDto(teamId, manifest, pluginRegistry)),
    sharedSkills: pluginRegistry.listTeamSkills(teamId)
  };
}

function toPluginDto(
  teamId: string,
  manifest: PluginManifest,
  pluginRegistry: PluginRegistry
): TeamPluginDto {
  return {
    ...manifest,
    tools: [...manifest.tools],
    skills: [...manifest.skills],
    installed: Boolean(pluginRegistry.get(manifest.id)),
    enabled: pluginRegistry.isEnabled(teamId, manifest.id)
  };
}

function createSeedPolicyCenter(): TeamPolicyCenter {
  const policyCenter = createTeamPolicyCenter();
  policyCenter.createTeam({
    id: "team-platform",
    name: "Platform"
  });
  policyCenter.addMember("team-platform", {
    userId: "user-admin",
    role: "admin"
  });
  policyCenter.createProject({
    id: "project-harness",
    teamId: "team-platform",
    name: "Harness Platform",
    allowedTools: ["read_file", "search_text"],
    allowedModels: ["gpt-5-mini"]
  });
  return policyCenter;
}

function createSeedPluginRegistry(): PluginRegistry {
  const registry = createPluginRegistry();
  const [reviewPack, opsPack] = createPluginCatalog();
  registry.install(reviewPack);
  registry.install(opsPack);
  registry.enableForTeam("team-platform", reviewPack.id);
  return registry;
}

function createPluginCatalog(): PluginManifest[] {
  return [
    {
      id: "review-pack",
      name: "Review Pack",
      version: "1.0.0",
      tools: ["read_file", "search_text"],
      skills: ["code-review"]
    },
    {
      id: "ops-pack",
      name: "Ops Pack",
      version: "1.0.0",
      tools: ["run_command"],
      skills: ["incident-response"]
    },
    {
      id: "research-pack",
      name: "Research Pack",
      version: "1.0.0",
      tools: ["search_text"],
      skills: ["deep-research"]
    }
  ];
}
