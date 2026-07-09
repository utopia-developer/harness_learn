import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
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
  assert.ok(readFile);

  const output = await readFile?.execute({ path: "README.md" }, {
    taskId: "task-1",
    runId: "run-1",
    messages: []
  });

  assert.equal(output, "hello harness\n");
});

test("builtin tools expose runtime metadata for safe scheduling", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });

  assert.deepEqual(
    tools.map((tool) => ({
      name: tool.name,
      source: tool.source,
      readOnly: tool.readOnly,
      destructive: tool.destructive,
      permission: tool.permission,
      concurrency: tool.concurrency
    })),
    [
      {
        name: "read_file",
        source: "builtin",
        readOnly: true,
        destructive: false,
        permission: "auto",
        concurrency: "safe"
      },
      {
        name: "write_file",
        source: "builtin",
        readOnly: false,
        destructive: true,
        permission: "ask",
        concurrency: "exclusive"
      },
      {
        name: "list_files",
        source: "builtin",
        readOnly: true,
        destructive: false,
        permission: "auto",
        concurrency: "safe"
      },
      {
        name: "search_text",
        source: "builtin",
        readOnly: true,
        destructive: false,
        permission: "auto",
        concurrency: "safe"
      },
      {
        name: "run_command",
        source: "builtin",
        readOnly: false,
        destructive: true,
        permission: "ask",
        concurrency: "exclusive"
      }
    ]
  );
});

test("list_files returns sorted workspace-relative file paths", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const listFiles = tools.find((tool) => tool.name === "list_files");
  assert.ok(listFiles);

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
  assert.ok(searchText);

  const output = await searchText?.execute({ query: "needle" }, {
    taskId: "task-1",
    runId: "run-1",
    messages: []
  });

  assert.equal(output, "src/app.ts:1:export const marker = 'needle';");
});

test("write_file refuses to overwrite a file that was not read first", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const writeTool = tools.find((tool) => tool.name === "write_file");
  assert.ok(writeTool);

  await assert.rejects(
    async () => {
      await writeTool.execute(
        { path: "README.md", content: "changed\n" },
        {
          taskId: "task-1",
          runId: "run-1",
          messages: [],
          toolFacts: { readFiles: new Set() }
        }
      );
    },
    /read.*before.*write/i
  );
});

test("write_file allows overwrite after read_file recorded the target path", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const readTool = tools.find((tool) => tool.name === "read_file");
  const writeTool = tools.find((tool) => tool.name === "write_file");
  assert.ok(readTool);
  assert.ok(writeTool);
  const toolFacts = { readFiles: new Set<string>() };

  await readTool?.execute(
    { path: "README.md" },
    { taskId: "task-1", runId: "run-1", messages: [], toolFacts }
  );
  await writeTool?.execute(
    { path: "README.md", content: "changed\n" },
    { taskId: "task-1", runId: "run-1", messages: [], toolFacts }
  );

  assert.equal(await readFile(join(workspaceRoot, "README.md"), "utf8"), "changed\n");
});

test("write_file allows creating a new file after read_file confirmed it is missing", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const readTool = tools.find((tool) => tool.name === "read_file");
  const writeTool = tools.find((tool) => tool.name === "write_file");
  assert.ok(readTool);
  assert.ok(writeTool);
  const toolFacts = { readFiles: new Set<string>() };

  await assert.rejects(
    async () => {
      await readTool.execute(
        { path: "new.txt" },
        { taskId: "task-1", runId: "run-1", messages: [], toolFacts }
      );
    },
    /not found/i
  );
  await writeTool?.execute(
    { path: "new.txt", content: "new\n" },
    { taskId: "task-1", runId: "run-1", messages: [], toolFacts }
  );

  assert.equal(await readFile(join(workspaceRoot, "new.txt"), "utf8"), "new\n");
});

test("run_command executes a command inside the workspace and reports output", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const runCommand = tools.find((tool) => tool.name === "run_command");
  assert.ok(runCommand);

  const output = await runCommand.execute(
    {
      command: process.execPath,
      args: ["-e", "console.log(process.cwd()); console.error('warn');"]
    },
    { taskId: "task-1", runId: "run-1", messages: [] }
  );

  assert.match(output, /exitCode: 0/);
  assert.match(output, new RegExp(`stdout:[\\s\\S]*${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(output, /stderr:[\s\S]*warn/);
});

test("run_command rejects workspace escape cwd", async () => {
  const workspaceRoot = await createWorkspace();
  const tools = createBuiltinTools({ workspaceRoot });
  const runCommand = tools.find((tool) => tool.name === "run_command");
  assert.ok(runCommand);

  await assert.rejects(
    async () => {
      await runCommand.execute(
        { command: process.execPath, args: ["-e", ""], cwd: ".." },
        { taskId: "task-1", runId: "run-1", messages: [] }
      );
    },
    /escapes workspace/i
  );
});
