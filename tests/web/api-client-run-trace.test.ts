import test from "node:test";
import assert from "node:assert/strict";

import { API_ENDPOINTS } from "../../packages/contracts/src/index.js";
import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("api client calls run detail trace endpoints", async () => {
  const calls: string[] = [];
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push(url);

      if (url.includes("/trace")) {
        return jsonResponse({
          taskId: "task-1",
          runId: "run-1",
          traceId: "trace-1",
          status: "running",
          events: []
        });
      }
      if (url.includes("/stream")) {
        return new Response("event: trace.event\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" }
        });
      }
      if (url.includes("/tool-outputs/")) {
        return jsonResponse({
          ref: "tool-output://run-1/call-1",
          taskId: "task-1",
          runId: "run-1",
          callId: "call-1",
          tool: "run_command",
          content: "ok",
          bytes: 2
        });
      }
      return jsonResponse({
        id: "replay-trace-1",
        traceId: "trace-1",
        taskId: "task-1",
        userMessage: "Run",
        expectedOutput: "done",
        expectedTools: ["run_command"]
      });
    }
  });

  await client.getRunTrace("task-1", "run-1");
  await client.getRunStreamSnapshot("task-1", "run-1");
  await client.getToolOutput("tool-output://run-1/call-1");
  await client.getReplayCase("trace-1");

  assert.deepEqual(calls, [
    "http://harness.local/api/v1/tasks/task-1/runs/run-1/trace",
    "http://harness.local/api/v1/tasks/task-1/runs/run-1/stream",
    "http://harness.local/api/v1/tool-outputs/tool-output%3A%2F%2Frun-1%2Fcall-1",
    "http://harness.local/api/v1/traces/trace-1/replay-case"
  ]);
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
