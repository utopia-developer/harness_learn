import {
  appendEvent,
  createRunState,
  type AgentEvent,
  type Clock,
  type RunState
} from "../core/events.js";
import type { ModelClient, ModelMessage, ToolCallChunk } from "../model/types.js";
import { decideToolPermission } from "../permissions/permission-engine.js";
import type {
  ApprovalHandler,
  ApprovalRecord,
  ApprovalStore,
  PermissionDecision,
  PermissionMode
} from "../permissions/types.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { ToolContract, ToolFacts } from "../tools/types.js";
import {
  createMemoryToolOutputStore,
  type ToolOutputStore
} from "./tool-output-store.js";

export type RunAgentInput = {
  taskId: string;
  runId: string;
  model: ModelClient;
  tools: ToolRegistry;
  userMessage: string;
  maxIterations: number;
  permissionMode?: PermissionMode;
  approvalHandler?: ApprovalHandler;
  approvalStore?: ApprovalStore;
  outputStore?: ToolOutputStore;
  now?: Clock;
  signal?: AbortSignal;
};

export async function* runAgent(input: RunAgentInput): AsyncIterable<AgentEvent> {
  const now = input.now ?? (() => new Date());
  let state = createRunState({
    taskId: input.taskId,
    runId: input.runId,
    now
  });

  yield state.events[0];

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: input.userMessage
    }
  ];
  const toolFacts: ToolFacts = {
    readFiles: new Set()
  };
  const outputStore = input.outputStore ?? createMemoryToolOutputStore();

  for (let iteration = 0; iteration < input.maxIterations; iteration += 1) {
    if (input.signal?.aborted) {
      const result = record(state, { type: "agent.cancelled", reason: "aborted" }, now);
      state = result.state;
      yield result.event;
      return;
    }

    let result = record(
      state,
      { type: "llm.started", model: input.model.name, purpose: "main" },
      now
    );
    state = result.state;
    yield result.event;

    let finalText = "";
    const toolCalls: ToolCallChunk[] = [];

    for await (const chunk of input.model.streamResponse({ messages })) {
      if (chunk.type === "text_delta") {
        finalText += chunk.text;
        result = record(state, { type: "llm.delta", text: chunk.text }, now);
        state = result.state;
        yield result.event;
      }

      if (chunk.type === "tool_call") {
        toolCalls.push(chunk);
      }

      if (chunk.type === "message_completed") {
        finalText = chunk.text;
      }
    }

    if (toolCalls.length === 0) {
      result = record(state, { type: "agent.completed", output: finalText }, now);
      state = result.state;
      yield result.event;
      return;
    }

    for (const toolCall of toolCalls) {
      result = record(
        state,
        {
          type: "tool.requested",
          callId: toolCall.callId,
          tool: toolCall.name,
          input: toolCall.input
        },
        now
      );
      state = result.state;
      yield result.event;

      const tool = input.tools.get(toolCall.name);
      if (!tool) {
        result = record(
          state,
          { type: "agent.failed", error: `Unknown tool: ${toolCall.name}` },
          now
        );
        state = result.state;
        yield result.event;
        return;
      }

      const permissionResolution = await resolveToolPermission({
        input,
        state,
        now,
        tool,
        toolCall,
        mode: input.permissionMode ?? "default"
      });
      for (const event of permissionResolution.events) {
        state = event.state;
        yield event.event;
      }
      if (!permissionResolution.allowed) {
        result = record(
          state,
          { type: "agent.failed", error: permissionResolution.reason },
          now
        );
        state = result.state;
        yield result.event;
        return;
      }

      const rawOutput = await tool.execute(toolCall.input, {
        taskId: input.taskId,
        runId: input.runId,
        messages,
        toolFacts
      });
      const output = await prepareToolOutput({
        output: rawOutput,
        outputLimitBytes: tool.outputLimitBytes,
        outputStore,
        taskId: input.taskId,
        runId: input.runId,
        callId: toolCall.callId,
        tool: tool.name
      });
      messages.push({
        role: "tool",
        toolCallId: toolCall.callId,
        content: output.messageContent
      });

      result = record(
        state,
        {
          type: "tool.completed",
          callId: toolCall.callId,
          output: output.eventOutput,
          outputRef: output.outputRef,
          truncated: output.truncated
        },
        now
      );
      state = result.state;
      yield result.event;
    }
  }

  const result = record(
    state,
    { type: "agent.failed", error: `Reached maximum iterations: ${input.maxIterations}` },
    now
  );
  yield result.event;
}

async function prepareToolOutput(input: {
  output: string;
  outputLimitBytes: number;
  outputStore: ToolOutputStore;
  taskId: string;
  runId: string;
  callId: string;
  tool: string;
}): Promise<{
  eventOutput: string;
  messageContent: string;
  outputRef?: string;
  truncated?: boolean;
}> {
  const bytes = Buffer.byteLength(input.output, "utf8");
  if (bytes <= input.outputLimitBytes) {
    return {
      eventOutput: input.output,
      messageContent: input.output
    };
  }

  const recordOutput = await input.outputStore.put({
    taskId: input.taskId,
    runId: input.runId,
    callId: input.callId,
    tool: input.tool,
    content: input.output,
    bytes
  });
  const message = `Tool output stored at ${recordOutput.ref} because it exceeded ${input.outputLimitBytes} bytes.`;

  return {
    eventOutput: message,
    messageContent: message,
    outputRef: recordOutput.ref,
    truncated: true
  };
}

async function resolveToolPermission(input: {
  input: RunAgentInput;
  state: RunState;
  now: Clock;
  tool: ToolContract;
  toolCall: ToolCallChunk;
  mode: PermissionMode;
}): Promise<{
  allowed: boolean;
  reason: string;
  events: { state: RunState; event: AgentEvent }[];
}> {
  const decision = decideToolPermission({ mode: input.mode, tool: input.tool });

  if (decision.decision === "allow") {
    return { allowed: true, reason: decision.reason, events: [] };
  }

  if (decision.decision === "deny") {
    const event = record(
      input.state,
      {
        type: "permission.resolved",
        callId: input.toolCall.callId,
        tool: input.tool.name,
        decision: "deny",
        source: "policy",
        reason: decision.reason
      },
      input.now
    );
    await recordApproval(input.input.approvalStore, {
      taskId: input.input.taskId,
      runId: input.input.runId,
      callId: input.toolCall.callId,
      tool: input.tool.name,
      decision: "deny",
      reason: decision.reason
    });
    return {
      allowed: false,
      reason: decision.reason,
      events: [event]
    };
  }

  return resolveApproval(input, decision);
}

async function resolveApproval(input: {
  input: RunAgentInput;
  state: RunState;
  now: Clock;
  tool: ToolContract;
  toolCall: ToolCallChunk;
  mode: PermissionMode;
}, decision: PermissionDecision): Promise<{
  allowed: boolean;
  reason: string;
  events: { state: RunState; event: AgentEvent }[];
}> {
  const requested = record(
    input.state,
    {
      type: "permission.requested",
      callId: input.toolCall.callId,
      tool: input.tool.name,
      input: input.toolCall.input,
      mode: input.mode,
      reason: decision.reason
    },
    input.now
  );

  if (!input.input.approvalHandler) {
    const reason = `Approval required for ${input.tool.name}, but no approval handler was provided`;
    const resolved = record(
      requested.state,
      {
        type: "permission.resolved",
        callId: input.toolCall.callId,
        tool: input.tool.name,
        decision: "deny",
        source: "system",
        reason
      },
      input.now
    );
    await recordApproval(input.input.approvalStore, {
      taskId: input.input.taskId,
      runId: input.input.runId,
      callId: input.toolCall.callId,
      tool: input.tool.name,
      decision: "deny",
      reason
    });
    return { allowed: false, reason, events: [requested, resolved] };
  }

  const approval = await input.input.approvalHandler({
    taskId: input.input.taskId,
    runId: input.input.runId,
    callId: input.toolCall.callId,
    tool: input.tool.name,
    input: input.toolCall.input,
    reason: decision.reason
  });
  const finalDecision = approval.approved ? "allow" : "deny";
  const resolved = record(
    requested.state,
    {
      type: "permission.resolved",
      callId: input.toolCall.callId,
      tool: input.tool.name,
      decision: finalDecision,
      source: "approval",
      reason: approval.reason
    },
    input.now
  );
  await recordApproval(input.input.approvalStore, {
    taskId: input.input.taskId,
    runId: input.input.runId,
    callId: input.toolCall.callId,
    tool: input.tool.name,
    decision: finalDecision,
    reason: approval.reason
  });

  return {
    allowed: approval.approved,
    reason: approval.reason,
    events: [requested, resolved]
  };
}

async function recordApproval(
  store: ApprovalStore | undefined,
  recordInput: ApprovalRecord
): Promise<void> {
  await store?.record(recordInput);
}

function record(
  state: RunState,
  event: Parameters<typeof appendEvent>[1],
  now: Clock
): { state: RunState; event: AgentEvent } {
  const next = appendEvent(state, event, { now });
  return {
    state: next,
    event: next.events[next.events.length - 1]
  };
}
