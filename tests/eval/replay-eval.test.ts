import test from "node:test";
import assert from "node:assert/strict";

import {
  createReplayCaseFromTrace,
  runEvalGate,
  type ReplayCase
} from "../../src/eval/replay-eval.js";
import { createTraceCollector } from "../../src/trace/trace-collector.js";

test("createReplayCaseFromTrace captures user goal, final output, and tool sequence", () => {
  const collector = createTraceCollector();
  collector.record({
    type: "agent.started",
    taskId: "task-1",
    runId: "run-1",
    traceId: "trace-1",
    timestamp: "2026-07-09T00:00:00.000Z"
  });
  collector.record({
    type: "tool.requested",
    taskId: "task-1",
    runId: "run-1",
    traceId: "trace-1",
    timestamp: "2026-07-09T00:00:01.000Z",
    callId: "call-1",
    tool: "read_file",
    input: { path: "README.md" }
  });
  collector.record({
    type: "agent.completed",
    taskId: "task-1",
    runId: "run-1",
    traceId: "trace-1",
    timestamp: "2026-07-09T00:00:02.000Z",
    output: "done"
  });

  const replayCase = createReplayCaseFromTrace({
    trace: collector.getTrace("trace-1")!,
    userMessage: "Read README"
  });

  assert.deepEqual(replayCase, {
    id: "replay-trace-1",
    traceId: "trace-1",
    taskId: "task-1",
    userMessage: "Read README",
    expectedOutput: "done",
    expectedTools: ["read_file"]
  });
});

test("runEvalGate fails when replay output or tool sequence changes", async () => {
  const replayCase: ReplayCase = {
    id: "case-1",
    traceId: "trace-1",
    taskId: "task-1",
    userMessage: "Read README",
    expectedOutput: "done",
    expectedTools: ["read_file"]
  };

  const result = await runEvalGate({
    cases: [replayCase],
    runner: async () => ({
      output: "changed",
      tools: ["search_text"]
    })
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.results[0].failures, [
    "Output changed",
    "Tool sequence changed"
  ]);
});

test("runEvalGate passes when replay behavior matches", async () => {
  const replayCase: ReplayCase = {
    id: "case-1",
    traceId: "trace-1",
    taskId: "task-1",
    userMessage: "Read README",
    expectedOutput: "done",
    expectedTools: ["read_file"]
  };

  const result = await runEvalGate({
    cases: [replayCase],
    runner: async () => ({
      output: "done",
      tools: ["read_file"]
    })
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.results[0].failures, []);
});
