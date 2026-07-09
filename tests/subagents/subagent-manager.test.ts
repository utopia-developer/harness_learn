import test from "node:test";
import assert from "node:assert/strict";

import {
  createSubAgentManager,
  type SubAgentTask
} from "../../src/subagents/subagent-manager.js";

test("createSubAgentManager runs read-only subagents with isolated context", async () => {
  const seenContexts: string[][] = [];
  const manager = createSubAgentManager({
    runner: async (task) => {
      seenContexts.push(task.context);
      return {
        id: task.id,
        status: "completed",
        summary: `${task.role}:${task.context.join("|")}`,
        permissionMode: task.permissionMode
      };
    }
  });
  const tasks: SubAgentTask[] = [
    {
      id: "sub-1",
      role: "reader",
      prompt: "Read docs",
      context: ["shared", "docs-only"],
      allowedTools: ["read_file"]
    },
    {
      id: "sub-2",
      role: "searcher",
      prompt: "Search code",
      context: ["shared", "code-only"],
      allowedTools: ["search_text"]
    }
  ];

  const result = await manager.runReadOnlyParallel(tasks);

  assert.deepEqual(seenContexts, [
    ["shared", "docs-only"],
    ["shared", "code-only"]
  ]);
  assert.deepEqual(
    result.results.map((item) => item.permissionMode),
    ["read_only", "read_only"]
  );
  assert.equal(result.summary, "reader:shared|docs-only\nsearcher:shared|code-only");
});

test("createSubAgentManager rejects tasks with write tools in read-only mode", async () => {
  const manager = createSubAgentManager({
    runner: async (task) => ({
      id: task.id,
      status: "completed",
      summary: "should not run",
      permissionMode: task.permissionMode
    })
  });

  await assert.rejects(
    async () => {
      await manager.runReadOnlyParallel([
        {
          id: "sub-1",
          role: "writer",
          prompt: "Write file",
          context: [],
          allowedTools: ["write_file"]
        }
      ]);
    },
    /not allowed in read-only subagent/i
  );
});
