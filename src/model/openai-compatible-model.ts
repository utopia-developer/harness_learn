import type { ModelChunk, ModelClient, ModelRequest } from "./types.js";

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export type OpenAICompatibleModelClientInput = {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  fetch?: FetchLike;
};

type OpenAIStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
};

type PendingToolCall = {
  callId: string;
  name: string;
  arguments: string;
};

export class OpenAICompatibleModelClient implements ModelClient {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: FetchLike;

  constructor(input: OpenAICompatibleModelClientInput) {
    this.name = input.model;
    this.baseUrl = normalizeBaseUrl(input.baseUrl ?? "https://api.openai.com/v1");
    this.apiKey = input.apiKey;
    this.fetchImpl = input.fetch ?? fetch;
  }

  async *streamResponse(request: ModelRequest): AsyncIterable<ModelChunk> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.createHeaders(),
      body: JSON.stringify({
        model: this.name,
        stream: true,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
          ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {})
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Model request failed: ${response.status} ${response.statusText}`);
    }

    let completedText = "";
    const pendingTools = new Map<number, PendingToolCall>();

    for await (const event of readSseEvents(response)) {
      if (event === "[DONE]") {
        break;
      }

      const parsed = JSON.parse(event) as OpenAIStreamChunk;
      for (const choice of parsed.choices ?? []) {
        const content = choice.delta?.content;
        if (content) {
          completedText += content;
          yield { type: "text_delta", text: content };
        }

        for (const toolCall of choice.delta?.tool_calls ?? []) {
          const pending = pendingTools.get(toolCall.index) ?? {
            callId: toolCall.id ?? `call-${toolCall.index}`,
            name: "",
            arguments: ""
          };
          pendingTools.set(toolCall.index, {
            callId: toolCall.id ?? pending.callId,
            name: toolCall.function?.name ?? pending.name,
            arguments: pending.arguments + (toolCall.function?.arguments ?? "")
          });
        }

        if (choice.finish_reason === "tool_calls") {
          for (const pending of pendingTools.values()) {
            yield {
              type: "tool_call",
              callId: pending.callId,
              name: pending.name,
              input: parseToolArguments(pending.arguments)
            };
          }
          pendingTools.clear();
        }
      }
    }

    if (completedText.length > 0) {
      yield { type: "message_completed", text: completedText };
    }
  }

  private createHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
}

async function* readSseEvents(response: Response): AsyncIterable<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    buffer += decoder.decode(chunk.value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = extractData(rawEvent);
      if (data) {
        yield data;
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}

function extractData(rawEvent: string): string {
  return rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");
}

function parseToolArguments(value: string): unknown {
  if (!value) {
    return {};
  }
  return JSON.parse(value);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}
