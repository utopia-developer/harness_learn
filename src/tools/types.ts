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
