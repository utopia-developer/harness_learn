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

test("frontend renders release readiness and exports audit evidence", async () => {
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

  const [releases, readiness] = await Promise.all([
    client.listReleases(),
    client.getReleaseReadiness("release-console-dogfood")
  ]);
  const gate = await client.runReleaseGate("release-console-dogfood");
  const auditJsonl = await client.getReleaseAuditJsonl("release-console-dogfood");
  const html = renderAppHtml({
    state: "ready",
    pathname: "/releases/release-console-dogfood",
    releaseReadiness: {
      releases,
      readiness: gate.readiness
    }
  });

  assert.equal(releases.total, 2);
  assert.equal(readiness.release.status, "blocked");
  assert.equal(gate.status, "blocked");
  assert.match(auditJsonl, /release.gate.started/);
  assert.match(html, /Release Readiness/);
  assert.match(html, /case-console-approval: Output changed/);
  assert.match(html, /release-console-dogfood\/audit\.jsonl/);
});

test("frontend renders governance settings and updates policy and plugins", async () => {
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

  const beforePolicy = await client.getProjectPolicy("project-harness");
  const simulation = await client.simulateProjectPolicy("project-harness", {
    tool: "write_file",
    model: "claude-3-opus"
  });
  const updatedPolicy = await client.updateProjectPolicy("project-harness", {
    allowedTools: ["read_file", "search_text", "run_command"],
    allowedModels: ["gpt-5", "gpt-5-mini"]
  });
  await client.installTeamPlugin("team-platform", "research-pack");
  const enabled = await client.enableTeamPlugin("team-platform", "research-pack");
  const plugins = await client.listTeamPlugins("team-platform");

  const policyHtml = renderAppHtml({
    state: "ready",
    pathname: "/settings/policy",
    policySettings: {
      policy: updatedPolicy,
      simulation
    }
  });
  const pluginsHtml = renderAppHtml({
    state: "ready",
    pathname: "/settings/plugins",
    pluginsSettings: plugins
  });

  assert.deepEqual(beforePolicy.policy.allowedModels, ["gpt-5-mini"]);
  assert.equal(simulation.tool.allowed, false);
  assert.equal(updatedPolicy.policy.allowedTools.includes("run_command"), true);
  assert.equal(enabled.plugin.enabled, true);
  assert.equal(plugins.sharedSkills.includes("deep-research"), true);
  assert.match(policyHtml, /Team Policy/);
  assert.match(policyHtml, /run_command/);
  assert.match(pluginsHtml, /Plugin Registry/);
  assert.match(pluginsHtml, /deep-research/);
});

test("frontend renders metrics dashboard from cost, quality and runtime APIs", async () => {
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

  const [cost, quality, runtime] = await Promise.all([
    client.getMetricsCost("project-harness"),
    client.getMetricsQuality("project-harness"),
    client.getMetricsRuntime("project-harness")
  ]);
  const html = renderAppHtml({
    state: "ready",
    pathname: "/metrics",
    metrics: {
      cost,
      quality,
      runtime
    }
  });

  assert.equal(cost.bySkill[0].name, "code-review");
  assert.equal(quality.passRate, 0.75);
  assert.equal(runtime.successRate, 0.8);
  assert.match(html, /Metrics/);
  assert.match(html, /gpt-5-mini/);
  assert.match(html, /nightly-regression/);
  assert.match(html, /Runtime health/);
});
