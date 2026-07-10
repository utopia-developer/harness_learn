import type { AgentEvent } from "../../../src/core/events.js";
import { createReplayCaseFromTrace } from "../../../src/eval/replay-eval.js";
import type { ToolOutputRecord } from "../../../src/runtime/tool-output-store.js";
import type { AgentTrace, TraceFailure } from "../../../src/trace/trace-collector.js";
import type {
  ReplayCaseResponse,
  RunTraceEventDto,
  RunTraceResponse,
  RunTraceStatus,
  ToolOutputResponse
} from "../../../packages/contracts/src/index.js";

export type RunTraceStore = {
  getRunTrace(taskId: string, runId: string): RunTraceResponse | undefined;
  getRunStream(taskId: string, runId: string): string | undefined;
  getToolOutput(ref: string): ToolOutputResponse | undefined;
  getReplayCase(traceId: string): ReplayCaseResponse | undefined;
};

export function createRunTraceStore(input = createSeedRunTraceData()): RunTraceStore {
  const traces = new Map(input.traces.map((trace) => [trace.traceId, trace]));
  const outputs = new Map(input.toolOutputs.map((output) => [output.ref, output]));
  const userMessages = new Map(Object.entries(input.userMessages));

  return {
    getRunTrace(taskId, runId) {
      const trace = [...traces.values()].find((item) =>
        item.taskId === taskId && item.runId === runId
      );
      return trace ? toRunTraceResponse(trace) : undefined;
    },
    getRunStream(taskId, runId) {
      const trace = [...traces.values()].find((item) =>
        item.taskId === taskId && item.runId === runId
      );
      return trace ? toSse(trace.events.map(toRunTraceEventDto)) : undefined;
    },
    getToolOutput(ref) {
      const output = outputs.get(ref);
      return output ? { ...output } : undefined;
    },
    getReplayCase(traceId) {
      const trace = traces.get(traceId);
      if (!trace) {
        return undefined;
      }
      return createReplayCaseFromTrace({
        trace,
        userMessage: userMessages.get(traceId) ?? ""
      });
    }
  };
}

function toRunTraceResponse(trace: AgentTrace): RunTraceResponse {
  return {
    taskId: trace.taskId,
    runId: trace.runId,
    traceId: trace.traceId,
    status: inferTraceStatus(trace.events),
    events: trace.events.map(toRunTraceEventDto),
    ...(trace.failure ? { failure: { ...trace.failure } } : {})
  };
}

function toRunTraceEventDto(event: AgentEvent, index: number): RunTraceEventDto {
  const base = {
    id: `${event.traceId}:${index + 1}`,
    sequence: index + 1,
    type: event.type,
    timestamp: event.timestamp
  };

  if (event.type === "agent.started") {
    return {
      ...base,
      title: "Agent started",
      summary: "Run execution started.",
      severity: "info"
    };
  }
  if (event.type === "llm.started") {
    return {
      ...base,
      title: "Model call",
      summary: `${event.model} for ${event.purpose}`,
      severity: "info",
      model: event.model
    };
  }
  if (event.type === "llm.delta") {
    return {
      ...base,
      title: "Model output",
      summary: event.text,
      severity: "info",
      output: event.text
    };
  }
  if (event.type === "tool.requested") {
    return {
      ...base,
      title: "Tool requested",
      summary: event.tool,
      severity: "warning",
      callId: event.callId,
      tool: event.tool,
      input: event.input
    };
  }
  if (event.type === "tool.completed") {
    return {
      ...base,
      title: "Tool completed",
      summary: event.truncated && event.outputRef ? "Output stored by reference." : event.output,
      severity: "success",
      callId: event.callId,
      output: event.output,
      outputRef: event.outputRef,
      truncated: event.truncated
    };
  }
  if (event.type === "permission.requested") {
    return {
      ...base,
      title: "Permission requested",
      summary: event.reason,
      severity: "warning",
      callId: event.callId,
      tool: event.tool,
      input: event.input,
      permission: {
        mode: event.mode,
        reason: event.reason
      }
    };
  }
  if (event.type === "permission.resolved") {
    return {
      ...base,
      title: "Permission resolved",
      summary: event.reason,
      severity: event.decision === "allow" ? "success" : "error",
      callId: event.callId,
      tool: event.tool,
      permission: {
        decision: event.decision,
        reason: event.reason
      }
    };
  }
  if (event.type === "agent.completed") {
    return {
      ...base,
      title: "Agent completed",
      summary: event.output,
      severity: "success",
      output: event.output
    };
  }
  if (event.type === "agent.failed") {
    return {
      ...base,
      title: "Agent failed",
      summary: event.error,
      severity: "error"
    };
  }
  return {
    ...base,
    title: "Agent cancelled",
    summary: event.reason,
    severity: "error"
  };
}

function inferTraceStatus(events: AgentEvent[]): RunTraceStatus {
  if (events.some((event) => event.type === "agent.failed")) {
    return "failed";
  }
  if (events.some((event) => event.type === "agent.cancelled")) {
    return "cancelled";
  }
  if (events.some((event) => event.type === "agent.completed")) {
    return "completed";
  }
  return "running";
}

function toSse(events: RunTraceEventDto[]): string {
  return events.map((event) =>
    `event: trace.event\ndata: ${JSON.stringify(event)}\n\n`
  ).join("");
}

function createSeedRunTraceData(): {
  traces: AgentTrace[];
  toolOutputs: ToolOutputRecord[];
  userMessages: Record<string, string>;
} {
  const timestamp = "2026-07-10T00:00:00.000Z";
  const failedEvents: AgentEvent[] = [
    {
      type: "agent.started",
      taskId: "task-failed-demo",
      runId: "run-failed-demo",
      traceId: "trace-failed-demo",
      timestamp
    },
    {
      type: "tool.requested",
      taskId: "task-failed-demo",
      runId: "run-failed-demo",
      traceId: "trace-failed-demo",
      timestamp: "2026-07-10T00:00:01.000Z",
      callId: "tool-call-failed",
      tool: "run_command",
      input: { cmd: "npm test" }
    },
    {
      type: "tool.completed",
      taskId: "task-failed-demo",
      runId: "run-failed-demo",
      traceId: "trace-failed-demo",
      timestamp: "2026-07-10T00:00:02.000Z",
      callId: "tool-call-failed",
      output: "stored output",
      outputRef: "tool-output://run-failed-demo/tool-call-failed",
      truncated: true
    },
    {
      type: "agent.failed",
      taskId: "task-failed-demo",
      runId: "run-failed-demo",
      traceId: "trace-failed-demo",
      timestamp: "2026-07-10T00:00:03.000Z",
      error: "test failed"
    }
  ];
  const completedEvents: AgentEvent[] = [
    {
      type: "agent.started",
      taskId: "task-completed-demo",
      runId: "run-completed-demo",
      traceId: "trace-completed-demo",
      timestamp
    },
    {
      type: "tool.requested",
      taskId: "task-completed-demo",
      runId: "run-completed-demo",
      traceId: "trace-completed-demo",
      timestamp: "2026-07-10T00:00:01.000Z",
      callId: "tool-call-read",
      tool: "read_file",
      input: { path: "README.md" }
    },
    {
      type: "agent.completed",
      taskId: "task-completed-demo",
      runId: "run-completed-demo",
      traceId: "trace-completed-demo",
      timestamp: "2026-07-10T00:00:02.000Z",
      output: "done"
    }
  ];
  const runningEvents: AgentEvent[] = [
    {
      type: "agent.started",
      taskId: "task-f0-demo",
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      timestamp
    },
    {
      type: "permission.requested",
      taskId: "task-f0-demo",
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      timestamp: "2026-07-10T00:00:01.000Z",
      callId: "tool-call-f0",
      tool: "exec_command",
      input: { cmd: "npm test" },
      mode: "default",
      reason: "需要执行测试验证前后端契约"
    }
  ];

  return {
    traces: [
      {
        traceId: "trace-failed-demo",
        taskId: "task-failed-demo",
        runId: "run-failed-demo",
        events: failedEvents,
        failure: inferFailure(failedEvents)
      },
      {
        traceId: "trace-completed-demo",
        taskId: "task-completed-demo",
        runId: "run-completed-demo",
        events: completedEvents
      },
      {
        traceId: "trace-f0-demo",
        taskId: "task-f0-demo",
        runId: "run-f0-demo",
        events: runningEvents
      }
    ],
    toolOutputs: [
      {
        ref: "tool-output://run-failed-demo/tool-call-failed",
        taskId: "task-failed-demo",
        runId: "run-failed-demo",
        callId: "tool-call-failed",
        tool: "run_command",
        content: "exitCode: 1\nstderr: test failed\n",
        bytes: 31
      }
    ],
    userMessages: {
      "trace-completed-demo": "复现已完成运行"
    }
  };
}

function inferFailure(events: AgentEvent[]): TraceFailure {
  const failed = events.find((event) => event.type === "agent.failed");
  return {
    module: "tool",
    message: failed?.type === "agent.failed" ? failed.error : "failed"
  };
}
