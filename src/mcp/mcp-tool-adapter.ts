import type { JsonSchema, ToolContract } from "../tools/types.js";

export type McpToolDeclaration = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

export type McpServerDefinition = {
  name: string;
  tools: McpToolDeclaration[];
};

export type McpClient = {
  callTool(tool: string, input: unknown): Promise<string> | string;
};

export type McpConnect = (server: McpServerDefinition) => Promise<McpClient> | McpClient;

export type CreateMcpToolContractsInput = {
  server: McpServerDefinition;
  connect: McpConnect;
  timeoutMs?: number;
  outputLimitBytes?: number;
};

export function createMcpToolContracts(input: CreateMcpToolContractsInput): ToolContract[] {
  let clientPromise: Promise<McpClient> | undefined;

  const getClient = async (): Promise<McpClient> => {
    clientPromise ??= Promise.resolve(input.connect(input.server));
    return clientPromise;
  };

  return input.server.tools.map((tool) => ({
    name: `mcp.${input.server.name}.${tool.name}`,
    description: tool.description,
    source: "mcp",
    inputSchema: tool.inputSchema,
    readOnly: false,
    destructive: true,
    permission: "ask",
    concurrency: "exclusive",
    outputLimitBytes: input.outputLimitBytes ?? 16_000,
    timeoutMs: input.timeoutMs ?? 10_000,
    execute: async (toolInput) => {
      const client = await getClient();
      return client.callTool(tool.name, toolInput);
    }
  }));
}
