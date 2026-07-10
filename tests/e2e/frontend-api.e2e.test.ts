import test from "node:test";
import assert from "node:assert/strict";

import { handleApiRequest } from "../../apps/api/src/server.js";
import { renderAppHtml } from "../../apps/web/src/app/render.js";
import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("frontend api client reads console dashboard through api gateway", async () => {
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const response = await handleApiRequest({
        method: init?.method ?? "GET",
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      return new Response(JSON.stringify(response.body), {
        status: response.statusCode,
        headers: response.headers
      });
    }
  });

  const dashboard = await client.getConsoleDashboard();
  const html = renderAppHtml({
    state: "ready",
    pathname: "/tasks",
    dashboard
  });

  assert.equal(dashboard.tasks[0].id, "task-f0-demo");
  assert.equal(dashboard.pendingApprovals[0].tool, "exec_command");
  assert.match(html, /验证前端 F0 Console Dashboard 闭环/);
  assert.match(html, /exec_command/);
  assert.match(html, /aria-current="page"/);
});

test("frontend can create a task and render it in the task center page", async () => {
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const response = await handleApiRequest({
        method: init?.method ?? "GET",
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      return new Response(JSON.stringify(response.body), {
        status: response.statusCode,
        headers: response.headers
      });
    }
  });

  await client.createTask({
    projectId: "project-harness",
    userId: "user-demo",
    goal: "端到端 F2 创建任务"
  });

  const [tasks, releaseSummary, metricsSummary] = await Promise.all([
    client.listTasks({ search: "F2", sort: "updated_desc" }),
    client.getReleaseSummary(),
    client.getMetricsSummary()
  ]);

  const html = renderAppHtml({
    state: "ready",
    pathname: "/tasks",
    taskCenter: {
      tasks,
      releaseSummary,
      metricsSummary
    }
  });

  assert.match(html, /端到端 F2 创建任务/);
  assert.match(html, /Pending/);
  assert.match(html, /name="goal"/);
});
