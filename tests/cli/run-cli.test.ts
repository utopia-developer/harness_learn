import test from "node:test";
import assert from "node:assert/strict";

import { runCli } from "../../src/cli/run-cli.js";

test("runCli executes a prompt through the runtime and writes JSONL events", async () => {
  const lines: string[] = [];

  const exitCode = await runCli({
    args: ["hello"],
    cwd: "/tmp",
    write: (line) => lines.push(line)
  });

  assert.equal(exitCode, 0);
  const events = lines.map((line) => JSON.parse(line) as { type: string; output?: string });
  assert.deepEqual(
    events.map((event) => event.type),
    ["agent.started", "llm.started", "llm.delta", "agent.completed"]
  );
  assert.equal(events.at(-1)?.output, "Harness received: hello");
});

test("runCli returns a usage error when no prompt is provided", async () => {
  const lines: string[] = [];

  const exitCode = await runCli({
    args: [],
    cwd: "/tmp",
    write: (line) => lines.push(line)
  });

  assert.equal(exitCode, 1);
  assert.equal(lines[0], "Usage: harness-learn <prompt>");
});
