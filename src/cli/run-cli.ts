import { randomUUID } from "node:crypto";

import { EchoModelClient } from "../model/echo-model.js";
import {
  OpenAICompatibleModelClient,
  type FetchLike
} from "../model/openai-compatible-model.js";
import type { ModelClient } from "../model/types.js";
import { runAgent } from "../runtime/agent-loop.js";
import { createBuiltinTools } from "../tools/builtin-tools.js";
import { createToolRegistry } from "../tools/registry.js";

export type RunCliInput = {
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
  write: (line: string) => void;
};

export async function runCli(input: RunCliInput): Promise<number> {
  const prompt = input.args.join(" ").trim();
  if (!prompt) {
    input.write("Usage: harness-learn <prompt>");
    return 1;
  }

  const model = createCliModel(input);
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

function createCliModel(input: RunCliInput): ModelClient {
  const env = input.env ?? process.env;
  if (env.HARNESS_MODEL_PROVIDER === "openai-compatible") {
    return new OpenAICompatibleModelClient({
      model: env.HARNESS_MODEL_NAME ?? "gpt-5-mini",
      baseUrl: env.HARNESS_MODEL_BASE_URL,
      apiKey: env.HARNESS_MODEL_API_KEY,
      fetch: input.fetch
    });
  }

  return new EchoModelClient();
}
