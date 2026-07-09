import {
  appendEvent,
  createRunState,
  type AgentEvent,
  type Clock,
  type RunState
} from "../core/events.js";
import type { ModelClient, ModelMessage, ToolCallChunk } from "../model/types.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { ToolFacts } from "../tools/types.js";

export type RunAgentInput = {
  taskId: string;
  runId: string;
  model: ModelClient;
  tools: ToolRegistry;
  userMessage: string;
  maxIterations: number;
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

      const output = await tool.execute(toolCall.input, {
        taskId: input.taskId,
        runId: input.runId,
        messages,
        toolFacts
      });
      messages.push({
        role: "tool",
        toolCallId: toolCall.callId,
        content: output
      });

      result = record(
        state,
        { type: "tool.completed", callId: toolCall.callId, output },
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
