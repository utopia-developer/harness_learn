import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import type { JsonSchema, ToolContract } from "./types.js";

export type BuiltinToolsOptions = {
  workspaceRoot: string;
};

export function createBuiltinTools(options: BuiltinToolsOptions): ToolContract[] {
  const workspaceRoot = resolve(options.workspaceRoot);

  return [
    withReadOnlyMetadata({
      name: "read_file",
      description: "Read a UTF-8 text file from the workspace.",
      inputSchema: objectSchema({
        path: { type: "string", description: "Workspace-relative file path" }
      }, ["path"]),
      execute: async (input, context) => {
        const path = readStringField(input, "path");
        const absolutePath = resolveWorkspacePath(workspaceRoot, path);
        const workspacePath = toWorkspaceRelative(workspaceRoot, absolutePath);
        context.toolFacts?.readFiles.add(workspacePath);
        try {
          return await readFile(absolutePath, "utf8");
        } catch (error) {
          if (isNodeError(error) && error.code === "ENOENT") {
            throw new Error(`File not found: ${workspacePath}`);
          }
          throw error;
        }
      }
    }),
    {
      name: "write_file",
      description: "Write a UTF-8 text file inside the workspace after the target has been read.",
      source: "builtin",
      inputSchema: objectSchema({
        path: { type: "string", description: "Workspace-relative file path" },
        content: { type: "string", description: "Complete replacement file content" }
      }, ["path", "content"]),
      readOnly: false,
      destructive: true,
      permission: "ask",
      concurrency: "exclusive",
      outputLimitBytes: 4_000,
      timeoutMs: 5_000,
      execute: async (input, context) => {
        const path = readStringField(input, "path");
        const content = readStringField(input, "content", { allowEmpty: true });
        const absolutePath = resolveWorkspacePath(workspaceRoot, path);
        const workspacePath = toWorkspaceRelative(workspaceRoot, absolutePath);

        if (!context.toolFacts?.readFiles.has(workspacePath)) {
          throw new Error(`Refusing to write ${workspacePath}: read file before write`);
        }

        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, content, "utf8");
        return `Wrote ${workspacePath}`;
      }
    },
    withReadOnlyMetadata({
      name: "list_files",
      description: "List files under the workspace.",
      inputSchema: objectSchema({}),
      execute: async () => {
        const files = await listWorkspaceFiles(workspaceRoot);
        return files.join("\n");
      }
    }),
    withReadOnlyMetadata({
      name: "search_text",
      description: "Search workspace text files for a plain-text query.",
      inputSchema: objectSchema({
        query: { type: "string", description: "Plain text query" }
      }, ["query"]),
      execute: async (input) => {
        const query = readStringField(input, "query");
        const files = await listWorkspaceFiles(workspaceRoot);
        const matches: string[] = [];

        for (const file of files) {
          const absolutePath = resolveWorkspacePath(workspaceRoot, file);
          const content = await readFile(absolutePath, "utf8");
          const lines = content.split(/\r?\n/);
          lines.forEach((line, index) => {
            if (line.includes(query)) {
              matches.push(`${file}:${index + 1}:${line}`);
            }
          });
        }

        return matches.join("\n");
      }
    })
  ];
}

function withReadOnlyMetadata(
  tool: Pick<ToolContract, "name" | "description" | "inputSchema" | "execute">
): ToolContract {
  return {
    ...tool,
    source: "builtin",
    readOnly: true,
    destructive: false,
    permission: "auto",
    concurrency: "safe",
    outputLimitBytes: 32_000,
    timeoutMs: 5_000
  };
}

function objectSchema(
  properties: Record<string, JsonSchema>,
  required: string[] = []
): JsonSchema {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false
  };
}

async function listWorkspaceFiles(workspaceRoot: string): Promise<string[]> {
  const results: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
        continue;
      }

      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        results.push(toWorkspaceRelative(workspaceRoot, absolutePath));
      }
    }
  }

  await visit(workspaceRoot);
  return results.sort();
}

function resolveWorkspacePath(workspaceRoot: string, path: string): string {
  const absolutePath = resolve(workspaceRoot, path);
  const relativePath = relative(workspaceRoot, absolutePath);
  if (relativePath.startsWith("..") || relativePath === "" || relativePath.startsWith("/")) {
    throw new Error(`Path escapes workspace: ${path}`);
  }
  return absolutePath;
}

function toWorkspaceRelative(workspaceRoot: string, absolutePath: string): string {
  return relative(workspaceRoot, absolutePath).split("\\").join("/");
}

function readStringField(
  input: unknown,
  field: string,
  options: { allowEmpty?: boolean } = {}
): string {
  if (!input || typeof input !== "object") {
    throw new Error(`Expected object input with string field "${field}"`);
  }

  const value = (input as Record<string, unknown>)[field];
  if (typeof value !== "string" || (!options.allowEmpty && value.length === 0)) {
    throw new Error(`Expected non-empty string field "${field}"`);
  }

  return value;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
