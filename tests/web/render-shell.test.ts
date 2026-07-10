import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createDemoConsoleDashboard } from "../../apps/api/src/dashboard-fixture.js";
import { renderAppHtml } from "../../apps/web/src/app/render.js";

test("rendered app html uses shared shell and dashboard data", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/approvals",
    dashboard: createDemoConsoleDashboard()
  });

  assert.match(html, /<aside class="sidebar" aria-label="主导航">/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /<main class="workspace" aria-label="审批队列内容区">/);
  assert.match(html, /Agent Harness 运行工作台/);
  assert.match(html, /验证前端 F0 Console Dashboard 闭环/);
  assert.match(html, /exec_command/);
});

test("rendered app html exposes loading and error states accessibly", () => {
  const loading = renderAppHtml({
    state: "loading",
    pathname: "/tasks"
  });
  const error = renderAppHtml({
    state: "error",
    pathname: "/tasks",
    error: new Error("API unavailable")
  });

  assert.match(loading, /aria-live="polite"/);
  assert.match(error, /role="alert"/);
  assert.match(error, /API unavailable/);
});

test("web styles define keyboard focus and active navigation states", async () => {
  const css = await readFile("apps/web/src/styles.css", "utf8");

  assert.match(css, /:focus-visible/);
  assert.match(css, /\[aria-current="page"\]/);
  assert.match(css, /outline:/);
});
