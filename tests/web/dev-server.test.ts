import test from "node:test";
import assert from "node:assert/strict";
import { type IncomingMessage } from "node:http";
import { join } from "node:path";
import { Readable } from "node:stream";

import {
  createApiGatewayRequest,
  resolveWebAsset
} from "../../apps/web/dev-server.js";

test("dev server api gateway forwards method, url, headers and json body", async () => {
  const request = Readable.from([
    JSON.stringify({
      allowedTools: ["read_file"],
      allowedModels: ["gpt-5-mini"]
    })
  ]) as IncomingMessage;
  request.method = "PUT";
  request.url = "/api/v1/projects/project-harness/policy";
  request.headers = {
    "content-type": "application/json",
    "x-harness-role": "viewer"
  };

  const apiRequest = await createApiGatewayRequest(
    request,
    new URL("http://127.0.0.1:5173/api/v1/projects/project-harness/policy")
  );

  assert.equal(apiRequest.method, "PUT");
  assert.equal(apiRequest.url, "/api/v1/projects/project-harness/policy");
  assert.equal(apiRequest.headers?.["x-harness-role"], "viewer");
  assert.deepEqual(apiRequest.body, {
    allowedTools: ["read_file"],
    allowedModels: ["gpt-5-mini"]
  });
});

test("dev server resolves app routes to index html for browser navigation", () => {
  const rootDir = "/workspace/harness";

  assert.deepEqual(resolveWebAsset("/", rootDir), {
    path: join(rootDir, "apps/web/index.html"),
    contentType: "text/html; charset=utf-8"
  });
  assert.deepEqual(resolveWebAsset("/settings/policy", rootDir), {
    path: join(rootDir, "apps/web/index.html"),
    contentType: "text/html; charset=utf-8"
  });
  assert.deepEqual(resolveWebAsset("/assets/main.js", rootDir), {
    path: join(rootDir, "dist/apps/web/src/main.js"),
    contentType: "text/javascript; charset=utf-8"
  });
});
