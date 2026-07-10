import type { ModelClient } from "../model/types.js";
import type { TeamPolicyCenter } from "../team/team-policy.js";
import { createToolRegistry, type ToolRegistry } from "../tools/registry.js";
import type { ToolContract } from "../tools/types.js";

export type ProjectScopedToolRegistryInput = {
  projectId: string;
  policyCenter: TeamPolicyCenter;
  tools: ToolContract[];
};

export type ProjectModelPolicyInput = {
  projectId: string;
  policyCenter: TeamPolicyCenter;
  model: ModelClient;
};

export function createProjectScopedToolRegistry(
  input: ProjectScopedToolRegistryInput
): ToolRegistry {
  const allowedTools = input.tools.filter((tool) =>
    input.policyCenter.canUseTool(input.projectId, tool.name)
  );

  return createToolRegistry({ tools: allowedTools });
}

export function assertProjectModelAllowed(input: ProjectModelPolicyInput): void {
  if (!input.policyCenter.canUseModel(input.projectId, input.model.name)) {
    throw new Error(`Model ${input.model.name} is not allowed for project ${input.projectId}`);
  }
}
