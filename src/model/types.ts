export type ModelMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
};

export type ModelRequest = {
  messages: ModelMessage[];
};

export type TextDeltaChunk = {
  type: "text_delta";
  text: string;
};

export type ToolCallChunk = {
  type: "tool_call";
  callId: string;
  name: string;
  input: unknown;
};

export type MessageCompletedChunk = {
  type: "message_completed";
  text: string;
};

export type ModelChunk = TextDeltaChunk | ToolCallChunk | MessageCompletedChunk;

export type ModelClient = {
  name: string;
  streamResponse(request: ModelRequest): AsyncIterable<ModelChunk>;
};
