import test from "node:test";
import assert from "node:assert/strict";

import { runAgent } from "../../src/runtime/agent-loop.js";
import { ScriptedModelClient } from "../../src/model/scripted-model.js";
import type { ModelClient, ModelRequest } from "../../src/model/types.js";
import { createMemoryStore } from "../../src/memory/memory-store.js";
import { createMemoryApprovalStore } from "../../src/permissions/approval-store.js";
import { createMemoryToolOutputStore } from "../../src/runtime/tool-output-store.js";
import { createTraceCollector } from "../../src/trace/trace-collector.js";
import { createToolRegistry } from "../../src/tools/registry.js";
import type { ToolContract } from "../../src/tools/types.js";

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const output = [];
  for await (const item of items) {
    output.push(item);
  }
  return output;
}

test("runAgent streams text and completes without tools", async () => {
  const model = new ScriptedModelClient("scripted", [
    [
      { type: "text_delta", text: "hello" },
      { type: "message_completed", text: "hello" }
    ]
  ]);

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({ tools: [] }),
      userMessage: "Say hello",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ["agent.started", "llm.started", "llm.delta", "agent.completed"]
  );
  const finalEvent = events.at(-1);
  assert.equal(finalEvent?.type, "agent.completed");
  assert.equal(finalEvent?.type === "agent.completed" ? finalEvent.output : "", "hello");
});

test("runAgent executes a tool call and continues with the tool result", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "tool_call", callId: "call-1", name: "echo", input: { text: "from tool" } }],
    [{ type: "message_completed", text: "done" }]
  ]);

  const echoTool: ToolContract = {
    name: "echo",
    description: "Echo text",
    source: "builtin",
    inputSchema: { type: "object" },
    readOnly: true,
    destructive: false,
    permission: "auto",
    concurrency: "safe",
    outputLimitBytes: 1024,
    timeoutMs: 1000,
    execute: async (input) => {
      assert.deepEqual(input, { text: "from tool" });
      return "from tool";
    }
  };

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({ tools: [echoTool] }),
      userMessage: "Use a tool",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.deepEqual(
    events.map((event) => event.type),
    [
      "agent.started",
      "llm.started",
      "tool.requested",
      "tool.completed",
      "llm.started",
      "agent.completed"
    ]
  );
  const toolCompleted = events.find((event) => event.type === "tool.completed");
  assert.equal(toolCompleted?.type === "tool.completed" ? toolCompleted.output : "", "from tool");
});

test("runAgent fails when the model keeps requesting tools beyond maxIterations", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "tool_call", callId: "call-1", name: "echo", input: { text: "1" } }],
    [{ type: "tool_call", callId: "call-2", name: "echo", input: { text: "2" } }]
  ]);

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({ tools: [
        {
          name: "echo",
          description: "Echo text",
          source: "builtin",
          inputSchema: { type: "object" },
          readOnly: true,
          destructive: false,
          permission: "auto",
          concurrency: "safe",
          outputLimitBytes: 1024,
          timeoutMs: 1000,
          execute: async () => "ok"
        }
      ] }),
      userMessage: "Loop",
      maxIterations: 1,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  const finalEvent = events.at(-1);
  assert.equal(finalEvent?.type, "agent.failed");
  assert.match(finalEvent?.type === "agent.failed" ? finalEvent.error : "", /maximum iterations/i);
});

test("runAgent emits cancelled when the abort signal is already aborted", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "message_completed", text: "should not run" }]
  ]);
  const controller = new AbortController();
  controller.abort();

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({ tools: [] }),
      userMessage: "Stop",
      maxIterations: 3,
      signal: controller.signal,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ["agent.started", "agent.cancelled"]
  );
});

test("runAgent treats disabled tools as unavailable at execution time", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "tool_call", callId: "call-1", name: "echo", input: { text: "blocked" } }]
  ]);

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({
        tools: [
          {
            name: "echo",
            description: "Echo text",
            source: "builtin",
            inputSchema: { type: "object" },
            readOnly: true,
            destructive: false,
            permission: "auto",
            concurrency: "safe",
            outputLimitBytes: 1024,
            timeoutMs: 1000,
            execute: async () => "should not execute"
          }
        ],
        disabledTools: ["echo"]
      }),
      userMessage: "Use disabled tool",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  const finalEvent = events.at(-1);
  assert.equal(finalEvent?.type, "agent.failed");
  assert.match(finalEvent?.type === "agent.failed" ? finalEvent.error : "", /unknown tool/i);
});

test("runAgent requests approval for ask tools and records approved decisions", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "tool_call", callId: "call-1", name: "write_file", input: { path: "a.txt" } }],
    [{ type: "message_completed", text: "done" }]
  ]);
  const approvalStore = createMemoryApprovalStore();
  let executed = false;

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({
        tools: [
          {
            name: "write_file",
            description: "Write file",
            source: "builtin",
            inputSchema: { type: "object" },
            readOnly: false,
            destructive: true,
            permission: "ask",
            concurrency: "exclusive",
            outputLimitBytes: 1024,
            timeoutMs: 1000,
            execute: async () => {
              executed = true;
              return "wrote";
            }
          }
        ]
      }),
      permissionMode: "default",
      approvalStore,
      approvalHandler: async (request) => {
        assert.equal(request.callId, "call-1");
        assert.equal(request.tool, "write_file");
        assert.match(request.reason, /需要审批/);
        return { approved: true, reason: "approved in test" };
      },
      userMessage: "Use write_file",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.equal(executed, true);
  assert.deepEqual(
    events.map((event) => event.type),
    [
      "agent.started",
      "llm.started",
      "tool.requested",
      "permission.requested",
      "permission.resolved",
      "tool.completed",
      "llm.started",
      "agent.completed"
    ]
  );
  assert.deepEqual(approvalStore.list(), [
    {
      taskId: "task-1",
      runId: "run-1",
      callId: "call-1",
      tool: "write_file",
      decision: "allow",
      reason: "approved in test"
    }
  ]);
});

test("runAgent denies non-read-only tools in read_only mode before execution", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "tool_call", callId: "call-1", name: "write_file", input: { path: "a.txt" } }]
  ]);
  let executed = false;

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({
        tools: [
          {
            name: "write_file",
            description: "Write file",
            source: "builtin",
            inputSchema: { type: "object" },
            readOnly: false,
            destructive: true,
            permission: "ask",
            concurrency: "exclusive",
            outputLimitBytes: 1024,
            timeoutMs: 1000,
            execute: async () => {
              executed = true;
              return "should not run";
            }
          }
        ]
      }),
      permissionMode: "read_only",
      userMessage: "Use write_file",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.equal(executed, false);
  const permissionResolved = events.find((event) => event.type === "permission.resolved");
  assert.equal(
    permissionResolved?.type === "permission.resolved" ? permissionResolved.decision : "",
    "deny"
  );
  const finalEvent = events.at(-1);
  assert.equal(finalEvent?.type, "agent.failed");
  assert.match(finalEvent?.type === "agent.failed" ? finalEvent.error : "", /read-only mode/i);
});

test("runAgent stores oversized tool output and sends a reference to the model", async () => {
  const requests: ModelRequest[] = [];
  const model: ModelClient = {
    name: "capture",
    async *streamResponse(request) {
      requests.push(request);
      if (requests.length === 1) {
        yield { type: "tool_call", callId: "call-1", name: "large", input: {} };
        return;
      }
      yield { type: "message_completed", text: "done" };
    }
  };
  const outputStore = createMemoryToolOutputStore();

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({
        tools: [
          {
            name: "large",
            description: "Large output",
            source: "builtin",
            inputSchema: { type: "object" },
            readOnly: true,
            destructive: false,
            permission: "auto",
            concurrency: "safe",
            outputLimitBytes: 8,
            timeoutMs: 1000,
            execute: async () => "0123456789abcdef"
          }
        ]
      }),
      outputStore,
      userMessage: "Use large tool",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  const toolCompleted = events.find((event) => event.type === "tool.completed");
  assert.equal(toolCompleted?.type === "tool.completed" ? toolCompleted.truncated : false, true);
  assert.equal(
    toolCompleted?.type === "tool.completed" ? toolCompleted.outputRef : "",
    "tool-output://run-1/call-1"
  );
  assert.equal(
    (await outputStore.get("tool-output://run-1/call-1"))?.content,
    "0123456789abcdef"
  );
  assert.equal(
    requests[1]?.messages.find((message) => message.role === "tool")?.content,
    "Tool output stored at tool-output://run-1/call-1 because it exceeded 8 bytes."
  );
});

test("runAgent redacts secrets from LLM and tool outputs before emitting events", async () => {
  const secret = "sk-abcdefghijklmnopqrstuvwxyz1234567890ABCD";
  const requests: ModelRequest[] = [];
  const model: ModelClient = {
    name: "secret-model",
    async *streamResponse(request) {
      requests.push(request);
      if (requests.length === 1) {
        yield { type: "text_delta", text: `model saw ${secret}` };
        yield { type: "tool_call", callId: "call-1", name: "secret_tool", input: {} };
        return;
      }
      yield { type: "message_completed", text: `final ${secret}` };
    }
  };

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({
        tools: [
          {
            name: "secret_tool",
            description: "Return secret",
            source: "builtin",
            inputSchema: { type: "object" },
            readOnly: true,
            destructive: false,
            permission: "auto",
            concurrency: "safe",
            outputLimitBytes: 1024,
            timeoutMs: 1000,
            execute: async () => `tool ${secret}`
          }
        ]
      }),
      userMessage: `user ${secret}`,
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.equal(JSON.stringify(events).includes(secret), false);
  assert.equal(JSON.stringify(requests).includes(secret), false);
  assert.equal(JSON.stringify(events).includes("[REDACTED:openai-api-key]"), true);
});

test("runAgent writes task summary memory only after completion", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "message_completed", text: "final answer" }]
  ]);
  const memoryStore = createMemoryStore();

  await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({ tools: [] }),
      memoryStore,
      userMessage: "Remember this task",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.deepEqual(memoryStore.list(), [
    {
      id: "memory-1",
      taskId: "task-1",
      runId: "run-1",
      kind: "task_summary",
      content: "User goal: Remember this task\nFinal output: final answer",
      createdAt: "2026-07-09T00:00:00.000Z"
    }
  ]);
});

test("runAgent does not write task memory when the run fails", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "tool_call", callId: "call-1", name: "missing", input: {} }]
  ]);
  const memoryStore = createMemoryStore();

  await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      model,
      tools: createToolRegistry({ tools: [] }),
      memoryStore,
      userMessage: "This should fail",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.deepEqual(memoryStore.list(), []);
});

test("runAgent stamps every event with traceId and records trace events", async () => {
  const model = new ScriptedModelClient("scripted", [
    [{ type: "message_completed", text: "done" }]
  ]);
  const traceCollector = createTraceCollector();

  const events = await collect(
    runAgent({
      taskId: "task-1",
      runId: "run-1",
      traceId: "trace-custom",
      traceCollector,
      model,
      tools: createToolRegistry({ tools: [] }),
      userMessage: "Trace this",
      maxIterations: 3,
      now: () => new Date("2026-07-09T00:00:00.000Z")
    })
  );

  assert.deepEqual([...new Set(events.map((event) => event.traceId))], ["trace-custom"]);
  assert.deepEqual(
    traceCollector.getTrace("trace-custom")?.events.map((event) => event.type),
    ["agent.started", "llm.started", "agent.completed"]
  );
});
