import type { ModelChunk, ModelClient, ModelRequest } from "./types.js";

export class ScriptedModelClient implements ModelClient {
  readonly name: string;
  private readonly responses: ModelChunk[][];
  private cursor = 0;

  constructor(name: string, responses: ModelChunk[][]) {
    this.name = name;
    this.responses = responses;
  }

  async *streamResponse(_request: ModelRequest): AsyncIterable<ModelChunk> {
    const response = this.responses[this.cursor] ?? [
      { type: "message_completed", text: "" }
    ];
    this.cursor += 1;

    for (const chunk of response) {
      yield chunk;
    }
  }
}
