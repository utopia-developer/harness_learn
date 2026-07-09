import { randomUUID } from "node:crypto";

import { EchoModelClient } from "../model/echo-model.js";
import { runAgent } from "../runtime/agent-loop.js";
import { createBuiltinTools } from "../tools/builtin-tools.js";
import { createToolRegistry } from "../tools/registry.js";

export type RunCliInput = {
  args: string[];
  cwd: string;
  write: (line: string) => void;
};

export async function runCli(input: RunCliInput): Promise<number> {
  const prompt = input.args.join(" ").trim();
  if (!prompt) {
    input.write("Usage: harness-learn <prompt>");
    return 1;
  }

  const model = new EchoModelClient();
  const tools = createToolRegistry({
    tools: createBuiltinTools({ workspaceRoot: input.cwd })
  });

  for await (const event of runAgent({
    taskId: randomUUID(),
    runId: randomUUID(),
    model,
    tools,
    userMessage: prompt,
    maxIterations: 3
  })) {
    input.write(JSON.stringify(event));
  }

  return 0;
}
