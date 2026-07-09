import type { PermissionDecisionType, PermissionMode } from "../permissions/types.js";

export type RunStatus = "running" | "completed" | "failed" | "cancelled";

export type EventBase = {
  taskId: string;
  runId: string;
  timestamp: string;
};

export type AgentStartedEvent = EventBase & {
  type: "agent.started";
};

export type LlmStartedEvent = EventBase & {
  type: "llm.started";
  model: string;
  purpose: string;
};

export type LlmDeltaEvent = EventBase & {
  type: "llm.delta";
  text: string;
};

export type ToolRequestedEvent = EventBase & {
  type: "tool.requested";
  callId: string;
  tool: string;
  input: unknown;
};

export type ToolCompletedEvent = EventBase & {
  type: "tool.completed";
  callId: string;
  output: string;
};

export type PermissionRequestedEvent = EventBase & {
  type: "permission.requested";
  callId: string;
  tool: string;
  input: unknown;
  mode: PermissionMode;
  reason: string;
};

export type PermissionResolvedEvent = EventBase & {
  type: "permission.resolved";
  callId: string;
  tool: string;
  decision: Exclude<PermissionDecisionType, "ask">;
  source: "policy" | "approval" | "system";
  reason: string;
};

export type AgentCompletedEvent = EventBase & {
  type: "agent.completed";
  output: string;
};

export type AgentFailedEvent = EventBase & {
  type: "agent.failed";
  error: string;
};

export type AgentCancelledEvent = EventBase & {
  type: "agent.cancelled";
  reason: string;
};

export type AgentEvent =
  | AgentStartedEvent
  | LlmStartedEvent
  | LlmDeltaEvent
  | ToolRequestedEvent
  | ToolCompletedEvent
  | PermissionRequestedEvent
  | PermissionResolvedEvent
  | AgentCompletedEvent
  | AgentFailedEvent
  | AgentCancelledEvent;

export type AgentEventInput = AgentEvent extends infer Event
  ? Event extends AgentEvent
    ? Omit<Event, keyof EventBase>
    : never
  : never;

export type Clock = () => Date;

export type RunState = {
  taskId: string;
  runId: string;
  status: RunStatus;
  events: AgentEvent[];
};

export function createRunState(input: {
  taskId: string;
  runId: string;
  now?: Clock;
}): RunState {
  const now = input.now ?? (() => new Date());
  const state: RunState = {
    taskId: input.taskId,
    runId: input.runId,
    status: "running",
    events: []
  };

  return appendEvent(state, { type: "agent.started" }, { now });
}

export function appendEvent(
  state: RunState,
  event: AgentEventInput,
  options: { now?: Clock } = {}
): RunState {
  const now = options.now ?? (() => new Date());
  const stamped = {
    ...event,
    taskId: state.taskId,
    runId: state.runId,
    timestamp: now().toISOString()
  } as AgentEvent;

  return {
    ...state,
    events: [...state.events, stamped]
  };
}
