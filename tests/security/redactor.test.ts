import test from "node:test";
import assert from "node:assert/strict";

import { createSecretRedactor } from "../../src/security/redactor.js";

test("createSecretRedactor redacts common API key patterns", () => {
  const redactor = createSecretRedactor();

  assert.equal(
    redactor.redactText("token sk-abcdefghijklmnopqrstuvwxyz1234567890ABCD"),
    "token [REDACTED:openai-api-key]"
  );
  assert.equal(
    redactor.redactText("AWS key AKIAIOSFODNN7EXAMPLE"),
    "AWS key [REDACTED:aws-access-key]"
  );
});

test("createSecretRedactor redacts nested object string fields", () => {
  const redactor = createSecretRedactor();

  assert.deepEqual(
    redactor.redactValue({
      header: "Bearer sk-abcdefghijklmnopqrstuvwxyz1234567890ABCD",
      nested: { safe: "hello" }
    }),
    {
      header: "Bearer [REDACTED:openai-api-key]",
      nested: { safe: "hello" }
    }
  );
});
