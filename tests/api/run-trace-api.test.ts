import test from "node:test";
import assert from "node:assert/strict";

import { API_ENDPOINTS, type RunTraceResponse } from "../../packages/contracts/src/index.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server exposes run trace with timeline events and failure module", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.runTrace("task-failed-demo", "run-failed-demo")
  });

  assert.equal(response.statusCode, 200);
  const body = response.body as RunTraceResponse;

  assert.equal(body.taskId, "task-failed-demo");
  assert.equal(body.runId, "run-failed-demo");
  assert.equal(body.traceId, "trace-failed-demo");
  assert.equal(body.status, "failed");
  assert.equal(body.failure?.module, "tool");
  assert.deepEqual(body.events.map((event) => event.type), [
    "agent.started",
    "tool.requested",
    "tool.completed",
    "agent.failed"
  ]);
  assert.equal(body.events[2].outputRef, "tool-output://run-failed-demo/tool-call-failed");
  assert.equal(body.events[2].truncated, true);
});

test("api server exposes run stream as server-sent events text", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.runStream("task-f0-demo", "run-f0-demo")
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "text/event-stream; charset=utf-8");
  assert.match(String(response.body), /event: trace.event/);
  assert.match(String(response.body), /"type":"permission.requested"/);
});

test("api server exposes stored tool output by ref", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.toolOutput("tool-output://run-failed-demo/tool-call-failed")
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ref: "tool-output://run-failed-demo/tool-call-failed",
    taskId: "task-failed-demo",
    runId: "run-failed-demo",
    callId: "tool-call-failed",
    tool: "run_command",
    content: "exitCode: 1\nstderr: test failed\n",
    bytes: 31
  });
});

test("api server exposes replay case for a trace", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.replayCase("trace-completed-demo")
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    id: "replay-trace-completed-demo",
    traceId: "trace-completed-demo",
    taskId: "task-completed-demo",
    userMessage: "复现已完成运行",
    expectedOutput: "done",
    expectedTools: ["read_file"]
  });
});
