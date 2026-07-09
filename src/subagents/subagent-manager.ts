import type { PermissionMode } from "../permissions/types.js";

export type SubAgentTask = {
  id: string;
  role: string;
  prompt: string;
  context: string[];
  allowedTools: string[];
};

export type SubAgentRunTask = SubAgentTask & {
  permissionMode: Extract<PermissionMode, "read_only">;
};

export type SubAgentResult = {
  id: string;
  status: "completed" | "failed";
  summary: string;
  permissionMode: PermissionMode;
};

export type SubAgentRunner = (task: SubAgentRunTask) => Promise<SubAgentResult> | SubAgentResult;

export type SubAgentManager = {
  runReadOnlyParallel(tasks: SubAgentTask[]): Promise<{
    results: SubAgentResult[];
    summary: string;
  }>;
};

const READ_ONLY_TOOLS = new Set(["read_file", "list_files", "search_text", "read_tool_output"]);

export function createSubAgentManager(input: { runner: SubAgentRunner }): SubAgentManager {
  return {
    async runReadOnlyParallel(tasks) {
      const guardedTasks = tasks.map((task) => toReadOnlyTask(task));
      const results = await Promise.all(guardedTasks.map((task) => input.runner(task)));
      return {
        results,
        summary: results.map((result) => result.summary).join("\n")
      };
    }
  };
}

function toReadOnlyTask(task: SubAgentTask): SubAgentRunTask {
  const blockedTool = task.allowedTools.find((toolName) => !READ_ONLY_TOOLS.has(toolName));
  if (blockedTool) {
    throw new Error(`Tool ${blockedTool} is not allowed in read-only subagent`);
  }

  return {
    ...task,
    context: [...task.context],
    allowedTools: [...task.allowedTools],
    permissionMode: "read_only"
  };
}
