import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  createSandboxProfile,
  validateCommandSandbox
} from "../../src/security/sandbox-profile.js";

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-sandbox-"));
  await writeFile(join(root, "allowed.txt"), "ok\n");
  return root;
}

test("validateCommandSandbox rejects absolute path arguments outside the workspace", async () => {
  const workspaceRoot = await createWorkspace();
  const profile = createSandboxProfile({ workspaceRoot });

  assert.throws(
    () => validateCommandSandbox({
      profile,
      command: "cat",
      args: ["/etc/passwd"],
      cwd: "."
    }),
    /outside sandbox/i
  );
});

test("validateCommandSandbox allows workspace paths and returns normalized cwd", async () => {
  const workspaceRoot = await createWorkspace();
  const profile = createSandboxProfile({ workspaceRoot });

  const result = validateCommandSandbox({
    profile,
    command: "cat",
    args: ["allowed.txt"],
    cwd: "."
  });

  assert.equal(result.cwd, workspaceRoot);
  assert.deepEqual(result.args, ["allowed.txt"]);
});

test("validateCommandSandbox enforces network allowlist", async () => {
  const workspaceRoot = await createWorkspace();
  const profile = createSandboxProfile({
    workspaceRoot,
    network: {
      mode: "allowlist",
      allowedHosts: ["api.example.com"]
    }
  });

  assert.doesNotThrow(() => validateCommandSandbox({
    profile,
    command: "curl",
    args: ["https://api.example.com/v1"],
    cwd: "."
  }));
  assert.throws(
    () => validateCommandSandbox({
      profile,
      command: "curl",
      args: ["https://evil.example.com/v1"],
      cwd: "."
    }),
    /network host not allowed/i
  );
});
