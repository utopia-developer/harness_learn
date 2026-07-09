import type { ModelMessage } from "../model/types.js";

export type ToolExecutionContext = {
  taskId: string;
  runId: string;
  messages: ModelMessage[];
};

export type ToolDefinition = {
  name: string;
  description: string;
  execute(input: unknown, context: ToolExecutionContext): Promise<string> | string;
};

export type ToolSource = "builtin" | "mcp" | "plugin" | "skill";

export type ToolPermission = "auto" | "ask" | "deny";

export type ToolConcurrency = "safe" | "exclusive" | "dynamic";

export type JsonSchema = {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
};

export type ToolContract = ToolDefinition & {
  source: ToolSource;
  inputSchema: JsonSchema;
  readOnly: boolean;
  destructive: boolean;
  permission: ToolPermission;
  concurrency: ToolConcurrency;
  outputLimitBytes: number;
  timeoutMs: number;
};
