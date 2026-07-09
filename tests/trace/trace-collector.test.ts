import test from "node:test";
import assert from "node:assert/strict";

import { createTraceCollector } from "../../src/trace/trace-collector.js";
import type { AgentEvent } from "../../src/core/events.js";

function event(type: AgentEvent["type"], overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    type,
    taskId: "task-1",
    runId: "run-1",
    traceId: "trace-1",
    timestamp: "2026-07-09T00:00:00.000Z",
    ...overrides
  } as AgentEvent;
}

test("createTraceCollector groups events by trace id and locates failure module", () => {
  const collector = createTraceCollector();

  collector.record(event("agent.started"));
  collector.record(event("llm.started", { model: "scripted", purpose: "main" }));
  collector.record(event("tool.requested", {
    callId: "call-1",
    tool: "run_command",
    input: {}
  }));
  collector.record(event("agent.failed", { error: "Command timed out" }));

  const trace = collector.getTrace("trace-1");

  assert.equal(trace?.traceId, "trace-1");
  assert.equal(trace?.events.length, 4);
  assert.equal(trace?.failure?.module, "tool");
  assert.equal(trace?.failure?.message, "Command timed out");
});
