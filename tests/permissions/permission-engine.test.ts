import test from "node:test";
import assert from "node:assert/strict";

import { decideToolPermission } from "../../src/permissions/permission-engine.js";
import type { ToolContract } from "../../src/tools/types.js";

function contract(overrides: Partial<ToolContract> = {}): ToolContract {
  return {
    name: "read_file",
    description: "tool",
    source: "builtin",
    inputSchema: { type: "object" },
    readOnly: true,
    destructive: false,
    permission: "auto",
    concurrency: "safe",
    outputLimitBytes: 1024,
    timeoutMs: 1000,
    execute: async () => "ok",
    ...overrides
  };
}

test("read_only mode allows read-only tools", () => {
  const decision = decideToolPermission({
    mode: "read_only",
    tool: contract({ readOnly: true })
  });

  assert.equal(decision.decision, "allow");
});

test("read_only mode denies non-read-only tools", () => {
  const decision = decideToolPermission({
    mode: "read_only",
    tool: contract({ name: "write_file", readOnly: false, permission: "ask" })
  });

  assert.equal(decision.decision, "deny");
  assert.match(decision.reason, /read-only mode/i);
});

test("default mode asks for tools that require approval", () => {
  const decision = decideToolPermission({
    mode: "default",
    tool: contract({ name: "write_file", readOnly: false, permission: "ask" })
  });

  assert.equal(decision.decision, "ask");
});

test("accept_edits mode allows write_file but still asks for run_command", () => {
  assert.equal(
    decideToolPermission({
      mode: "accept_edits",
      tool: contract({ name: "write_file", readOnly: false, permission: "ask" })
    }).decision,
    "allow"
  );
  assert.equal(
    decideToolPermission({
      mode: "accept_edits",
      tool: contract({ name: "run_command", readOnly: false, destructive: true, permission: "ask" })
    }).decision,
    "ask"
  );
});

test("auto mode allows non-denied tools", () => {
  const decision = decideToolPermission({
    mode: "auto",
    tool: contract({ name: "run_command", readOnly: false, destructive: true, permission: "ask" })
  });

  assert.equal(decision.decision, "allow");
});

test("tool-level deny always wins", () => {
  const decision = decideToolPermission({
    mode: "auto",
    tool: contract({ permission: "deny" })
  });

  assert.equal(decision.decision, "deny");
});
