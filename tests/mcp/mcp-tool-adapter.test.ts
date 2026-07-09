import test from "node:test";
import assert from "node:assert/strict";

import { createMcpToolContracts } from "../../src/mcp/mcp-tool-adapter.js";
import { createToolRegistry } from "../../src/tools/registry.js";

test("createMcpToolContracts imports declared tools without connecting to the server", () => {
  let connectCount = 0;

  const tools = createMcpToolContracts({
    server: {
      name: "docs",
      tools: [
        {
          name: "search",
          description: "Search docs",
          inputSchema: { type: "object" }
        }
      ]
    },
    connect: async () => {
      connectCount += 1;
      return {
        callTool: async () => "result"
      };
    }
  });
  const registry = createToolRegistry({ tools });

  assert.equal(connectCount, 0);
  assert.deepEqual(
    registry.list().map((tool) => ({
      name: tool.name,
      source: tool.source,
      permission: tool.permission,
      readOnly: tool.readOnly,
      destructive: tool.destructive
    })),
    [
      {
        name: "mcp.docs.search",
        source: "mcp",
        permission: "ask",
        readOnly: false,
        destructive: true
      }
    ]
  );
});

test("MCP tool connects lazily and reuses the connection", async () => {
  let connectCount = 0;
  const tools = createMcpToolContracts({
    server: {
      name: "linear",
      tools: [
        {
          name: "get_issue",
          description: "Get issue",
          inputSchema: { type: "object" }
        }
      ]
    },
    connect: async () => {
      connectCount += 1;
      return {
        callTool: async (tool, input) => `${tool}:${JSON.stringify(input)}`
      };
    }
  });
  const tool = tools[0];

  assert.equal(await tool.execute({ id: "ISSUE-1" }, {
    taskId: "task-1",
    runId: "run-1",
    messages: []
  }), 'get_issue:{"id":"ISSUE-1"}');
  assert.equal(await tool.execute({ id: "ISSUE-2" }, {
    taskId: "task-1",
    runId: "run-1",
    messages: []
  }), 'get_issue:{"id":"ISSUE-2"}');
  assert.equal(connectCount, 1);
});

test("MCP server connection failure does not happen during tool registry creation", async () => {
  const tools = createMcpToolContracts({
    server: {
      name: "offline",
      tools: [
        {
          name: "ping",
          description: "Ping",
          inputSchema: { type: "object" }
        }
      ]
    },
    connect: async () => {
      throw new Error("server unavailable");
    }
  });

  assert.doesNotThrow(() => createToolRegistry({ tools }));
  await assert.rejects(
    async () => {
      await tools[0].execute({}, { taskId: "task-1", runId: "run-1", messages: [] });
    },
    /server unavailable/i
  );
});
