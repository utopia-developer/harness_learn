import type { ToolContract } from "./types.js";

export type ToolRegistry = {
  list(): ToolContract[];
  get(name: string): ToolContract | undefined;
};

export type ToolRegistryInput = {
  tools: ToolContract[];
  disabledTools?: string[];
};

export function createToolRegistry(input: ToolRegistryInput): ToolRegistry {
  const disabled = new Set(input.disabledTools ?? []);
  const enabledTools = input.tools.filter((tool) => !disabled.has(tool.name));
  const byName = new Map<string, ToolContract>();

  for (const tool of enabledTools) {
    if (byName.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    byName.set(tool.name, tool);
  }

  return {
    list: () => enabledTools,
    get: (name) => byName.get(name)
  };
}
