import type { AgentEvent } from "../core/events.js";

export type TraceFailure = {
  module: "agent" | "llm" | "tool" | "permission";
  message: string;
};

export type AgentTrace = {
  traceId: string;
  taskId: string;
  runId: string;
  events: AgentEvent[];
  failure?: TraceFailure;
};

export type TraceCollector = {
  record(event: AgentEvent): void;
  getTrace(traceId: string): AgentTrace | undefined;
  listTraces(): AgentTrace[];
};

export function createTraceCollector(): TraceCollector {
  const traces = new Map<string, AgentTrace>();

  return {
    record(event) {
      const existing = traces.get(event.traceId);
      const trace = existing ?? {
        traceId: event.traceId,
        taskId: event.taskId,
        runId: event.runId,
        events: []
      };
      trace.events.push({ ...event });
      if (event.type === "agent.failed") {
        trace.failure = {
          module: inferFailureModule(trace.events),
          message: event.error
        };
      }
      traces.set(event.traceId, trace);
    },
    getTrace(traceId) {
      const trace = traces.get(traceId);
      return trace ? cloneTrace(trace) : undefined;
    },
    listTraces() {
      return [...traces.values()].map(cloneTrace);
    }
  };
}

function inferFailureModule(events: AgentEvent[]): TraceFailure["module"] {
  const lastAction = [...events].reverse().find((event) =>
    event.type === "tool.requested" ||
    event.type === "permission.requested" ||
    event.type === "llm.started"
  );

  if (lastAction?.type === "tool.requested") {
    return "tool";
  }
  if (lastAction?.type === "permission.requested") {
    return "permission";
  }
  if (lastAction?.type === "llm.started") {
    return "llm";
  }
  return "agent";
}

function cloneTrace(trace: AgentTrace): AgentTrace {
  return {
    ...trace,
    events: trace.events.map((event) => ({ ...event })),
    failure: trace.failure ? { ...trace.failure } : undefined
  };
}
