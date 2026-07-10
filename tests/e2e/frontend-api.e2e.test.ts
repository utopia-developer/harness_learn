import test from "node:test";
import assert from "node:assert/strict";

import { handleApiRequest } from "../../apps/api/src/server.js";
import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("frontend api client reads console dashboard through api gateway", async () => {
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const response = handleApiRequest({
        method: init?.method ?? "GET",
        url
      });

      return new Response(JSON.stringify(response.body), {
        status: response.statusCode,
        headers: response.headers
      });
    }
  });

  const dashboard = await client.getConsoleDashboard();

  assert.equal(dashboard.tasks[0].id, "task-f0-demo");
  assert.equal(dashboard.pendingApprovals[0].tool, "exec_command");
});
