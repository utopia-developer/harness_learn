import test from "node:test";
import assert from "node:assert/strict";

import { createToolRegistry } from "../../src/tools/registry.js";
import type { ToolContract } from "../../src/tools/types.js";

function tool(name: string): ToolContract {
  return {
    name,
    description: `${name} tool`,
    source: "builtin",
    inputSchema: { type: "object" },
    readOnly: true,
    destructive: false,
    permission: "auto",
    concurrency: "safe",
    outputLimitBytes: 1024,
    timeoutMs: 1000,
    execute: async () => `${name} output`
  };
}

test("createToolRegistry indexes enabled tools by name", () => {
  const registry = createToolRegistry({
    tools: [tool("read_file"), tool("list_files")]
  });

  assert.deepEqual(registry.list().map((item) => item.name), ["read_file", "list_files"]);
  assert.equal(registry.get("read_file")?.description, "read_file tool");
});

test("createToolRegistry excludes disabled tools from list and lookup", () => {
  const registry = createToolRegistry({
    tools: [tool("read_file"), tool("run_command")],
    disabledTools: ["run_command"]
  });

  assert.deepEqual(registry.list().map((item) => item.name), ["read_file"]);
  assert.equal(registry.get("run_command"), undefined);
});

test("createToolRegistry rejects duplicate enabled tool names", () => {
  assert.throws(
    () =>
      createToolRegistry({
        tools: [tool("read_file"), tool("read_file")]
      }),
    /duplicate tool/i
  );
});
