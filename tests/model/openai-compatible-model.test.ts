import test from "node:test";
import assert from "node:assert/strict";

import { OpenAICompatibleModelClient } from "../../src/model/openai-compatible-model.js";

test("OpenAICompatibleModelClient sends a streaming chat completion request", async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const client = new OpenAICompatibleModelClient({
    model: "gpt-5-mini",
    baseUrl: "https://llm.example.test/v1",
    apiKey: "test-key",
    fetch: async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(
        [
          'data: {"choices":[{"delta":{"content":"hello "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"world"}}]}\n\n',
          'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
          "data: [DONE]\n\n"
        ].join(""),
        { status: 200 }
      );
    }
  });

  const chunks = [];
  for await (const chunk of client.streamResponse({
    messages: [{ role: "user", content: "Say hello" }]
  })) {
    chunks.push(chunk);
  }

  assert.equal(requests[0].url, "https://llm.example.test/v1/chat/completions");
  assert.equal(requests[0].init.method, "POST");
  assert.equal((requests[0].init.headers as Record<string, string>).Authorization, "Bearer test-key");
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), {
    model: "gpt-5-mini",
    stream: true,
    messages: [{ role: "user", content: "Say hello" }]
  });
  assert.deepEqual(chunks, [
    { type: "text_delta", text: "hello " },
    { type: "text_delta", text: "world" },
    { type: "message_completed", text: "hello world" }
  ]);
});

test("OpenAICompatibleModelClient converts streamed tool calls into harness chunks", async () => {
  const client = new OpenAICompatibleModelClient({
    model: "gpt-5-mini",
    baseUrl: "https://llm.example.test/v1",
    fetch: async () =>
      new Response(
        [
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"read_file","arguments":"{\\"path\\""}}]}}]}\n\n',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"README.md\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n',
          "data: [DONE]\n\n"
        ].join(""),
        { status: 200 }
      )
  });

  const chunks = [];
  for await (const chunk of client.streamResponse({
    messages: [{ role: "user", content: "Read README" }]
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, [
    {
      type: "tool_call",
      callId: "call-1",
      name: "read_file",
      input: { path: "README.md" }
    }
  ]);
});

test("OpenAICompatibleModelClient reports upstream errors", async () => {
  const client = new OpenAICompatibleModelClient({
    model: "gpt-5-mini",
    baseUrl: "https://llm.example.test/v1",
    fetch: async () => new Response("bad gateway", { status: 502, statusText: "Bad Gateway" })
  });

  await assert.rejects(
    async () => {
      for await (const _chunk of client.streamResponse({
        messages: [{ role: "user", content: "hello" }]
      })) {
        // exhaust stream
      }
    },
    /model request failed: 502 bad gateway/i
  );
});
