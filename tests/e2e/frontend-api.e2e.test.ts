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

test("frontend renders run detail from trace api with output ref and replay entry", async () => {
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const response = await handleApiRequest({
        method: init?.method ?? "GET",
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      return new Response(
        typeof response.body === "string" ? response.body : JSON.stringify(response.body),
        {
          status: response.statusCode,
          headers: response.headers
        }
      );
    }
  });

  const [trace, stream, output, replayCase] = await Promise.all([
    client.getRunTrace("task-failed-demo", "run-failed-demo"),
    client.getRunStreamSnapshot("task-failed-demo", "run-failed-demo"),
    client.getToolOutput("tool-output://run-failed-demo/tool-call-failed"),
    client.getReplayCase("trace-completed-demo")
  ]);

  const html = renderAppHtml({
    state: "ready",
    pathname: "/tasks/task-failed-demo/runs/run-failed-demo",
    runDetail: {
      trace,
      selectedEventId: "trace-failed-demo:2"
    }
  });

  assert.equal(trace.failure?.module, "tool");
  assert.match(stream, /event: trace.event/);
  assert.equal(output.content, "exitCode: 1\nstderr: test failed\n");
  assert.equal(replayCase.expectedTools[0], "read_file");
  assert.match(html, /Trace Timeline/);
  assert.match(html, /tool-output%3A%2F%2Frun-failed-demo%2Ftool-call-failed/);
});

test("frontend renders approval queue and updates it after approval actions", async () => {
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

  const before = await client.listApprovals({ status: "pending" });
  const beforeHtml = renderAppHtml({
    state: "ready",
    pathname: "/approvals",
    approvalQueue: before
  });
  const approved = await client.approveApproval("approval-run-command", {
    reason: "Reviewed"
  });
  const denied = await client.denyApproval("approval-write-file", {
    reason: "Risk too high"
  });
  const suggestion = await client.applyPolicySuggestion("suggestion-allow-npm-test");
  const after = await client.listApprovals({ status: "pending" });

  assert.match(beforeHtml, /High risk/);
  assert.equal(approved.runEffect.status, "continues");
  assert.equal(denied.runEffect.status, "failed");
  assert.equal(suggestion.suggestion.status, "applied");
  assert.equal(before.total, 2);
  assert.equal(after.total, 0);
});
