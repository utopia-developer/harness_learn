import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createBuiltinTools } from "../../src/tools/builtin-tools.js";

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-tools-"));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "README.md"), "hello harness\n");
  await writeFile(join(root, "src", "app.ts"), "export const marker = 'needle';\n");
  return root;
}

test("read_file returns file content relative to the workspace", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const readFile = tools.find((tool) => tool.name === "read_file");

  const output = await readFile?.execute({ path: "README.md" }, {
    taskId: "task-1",
    runId: "run-1",
    messages: []
  });

  assert.equal(output, "hello harness\n");
});

test("list_files returns sorted workspace-relative file paths", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const listFiles = tools.find((tool) => tool.name === "list_files");

  const output = await listFiles?.execute({}, {
    taskId: "task-1",
    runId: "run-1",
    messages: []
  });

  assert.equal(output, "README.md\nsrc/app.ts");
});

test("search_text returns matching lines with file and line number", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const searchText = tools.find((tool) => tool.name === "search_text");

  const output = await searchText?.execute({ query: "needle" }, {
    taskId: "task-1",
    runId: "run-1",
    messages: []
  });

  assert.equal(output, "src/app.ts:1:export const marker = 'needle';");
});
