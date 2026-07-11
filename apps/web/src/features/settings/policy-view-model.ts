import { API_ENDPOINTS } from "../../../../../packages/contracts/src/index.js";
import type {
  PolicySimulationDecisionDto,
  PolicySimulationResponse,
  ProjectPolicyResponse
} from "../../../../../packages/contracts/src/index.js";

export type PolicyViewModel = {
  projectId: string;
  projectName: string;
  teamId: string;
  updateAction: string;
  simulateAction: string;
  tools: Array<{
    name: string;
    allowed: boolean;
  }>;
  models: Array<{
    name: string;
    allowed: boolean;
  }>;
  simulation?: {
    tool: PolicyDecisionViewModel;
    model: PolicyDecisionViewModel;
  };
};

export type PolicyDecisionViewModel = {
  name: string;
  label: "允许" | "拒绝";
  tone: "success" | "danger";
  reason: string;
};

export function createPolicyViewModel(input: {
  policy: ProjectPolicyResponse;
  simulation?: PolicySimulationResponse;
}): PolicyViewModel {
  const projectId = input.policy.project.id;

  return {
    projectId,
    projectName: input.policy.project.name,
    teamId: input.policy.project.teamId,
    updateAction: API_ENDPOINTS.projectPolicy(projectId),
    simulateAction: API_ENDPOINTS.simulateProjectPolicy(projectId),
    tools: input.policy.availableTools.map((tool) => ({
      name: tool,
      allowed: input.policy.policy.allowedTools.includes(tool)
    })),
    models: input.policy.availableModels.map((model) => ({
      name: model,
      allowed: input.policy.policy.allowedModels.includes(model)
    })),
    simulation: input.simulation ? {
      tool: toDecision(input.simulation.tool),
      model: toDecision(input.simulation.model)
    } : undefined
  };
}

function toDecision(decision: PolicySimulationDecisionDto): PolicyDecisionViewModel {
  return {
    name: decision.name,
    label: decision.allowed ? "允许" : "拒绝",
    tone: decision.allowed ? "success" : "danger",
    reason: decision.reason
  };
}
