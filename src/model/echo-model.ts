import type { ModelChunk, ModelClient, ModelRequest } from "./types.js";

export class EchoModelClient implements ModelClient {
  readonly name = "echo";

  async *streamResponse(request: ModelRequest): AsyncIterable<ModelChunk> {
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((message) => message.role === "user");
    const text = `Harness received: ${lastUserMessage?.content ?? ""}`;

    yield { type: "text_delta", text };
    yield { type: "message_completed", text };
  }
}
