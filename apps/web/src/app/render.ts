import type { ConsoleDashboardResponse } from "../../../../packages/contracts/src/index.js";
import {
  createLoadingState,
  createMetricCard
} from "../design-system/index.js";
import type { ApiClient } from "../shared/api/client.js";
import { createDashboardViewModel } from "../features/console/dashboard-view-model.js";
import { createAppShellViewModel } from "./shell.js";

export async function renderApp(root: HTMLElement, client: ApiClient): Promise<void> {
  const pathname = root.ownerDocument.location?.pathname ?? "/";
  root.innerHTML = renderAppHtml({
    state: "loading",
    pathname
  });

  try {
    const dashboard = await client.getConsoleDashboard();
    root.innerHTML = renderAppHtml({
      state: "ready",
      pathname,
      dashboard
    });
  } catch (error) {
    root.innerHTML = renderAppHtml({
      state: "error",
      pathname,
      error
    });
  }
}

export type RenderState = "loading" | "ready" | "error";

export type RenderAppHtmlInput = {
  state: RenderState;
  pathname: string;
  dashboard?: ConsoleDashboardResponse;
  error?: unknown;
};

export function renderAppHtml(input: RenderAppHtmlInput): string {
  const shell = createAppShellViewModel(input.pathname);
  const viewModel = input.dashboard
    ? createDashboardViewModel(input.dashboard)
    : undefined;

  return `
    <div class="app-shell">
      <aside class="sidebar" aria-label="主导航">
        <div class="brand">${escapeHtml(shell.brand)}</div>
        <nav class="nav">${shell.navigation.map((item) =>
          `<a href="${item.href}"${item.ariaCurrent ? ` aria-current="${item.ariaCurrent}"` : ""}>${escapeHtml(item.label)}</a>`
        ).join("")}</nav>
      </aside>
      <main class="workspace" aria-label="${escapeHtml(shell.mainRegionAriaLabel)}">
        <header class="topbar">
          <div>
            <p class="eyebrow">${escapeHtml(shell.currentPage.label)}</p>
            <h1>Agent Harness 运行工作台</h1>
            <p class="page-context">${escapeHtml(shell.topbar.title)} · ${escapeHtml(shell.topbar.description)}</p>
          </div>
          <span class="status-pill">${stateLabel(input.state)}</span>
        </header>
        ${renderContent(input.state, viewModel, input.error)}
      </main>
    </div>
  `;
}

function renderContent(
  state: RenderState,
  viewModel?: ReturnType<typeof createDashboardViewModel>,
  error?: unknown
): string {
  if (state === "loading") {
    const loading = createLoadingState("正在加载运行数据...");
    return `<section class="panel" aria-live="${loading.ariaLive}"><p>${loading.label}</p></section>`;
  }

  if (state === "error") {
    return `
      <section class="panel error-panel" role="alert">
        <h2>无法加载 Console Dashboard</h2>
        <p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>
      </section>
    `;
  }

  if (!viewModel) {
    return "";
  }

  return `
    <section class="metrics-grid">
      ${[
        createMetricCard({ label: "任务", value: viewModel.totalTasks }),
        createMetricCard({ label: "待审批", value: viewModel.pendingApprovalCount }),
        createMetricCard({ label: "运行 Trace", value: viewModel.runningTraceCount })
      ].map((metric) =>
        `<article><span>${escapeHtml(metric.label)}</span><strong>${metric.value}</strong></article>`
      ).join("")}
    </section>
    <section class="panel">
      <h2>当前任务</h2>
      ${viewModel.primaryTask ? `
        <div class="task-row">
          <div>
            <strong>${escapeHtml(viewModel.primaryTask.goal)}</strong>
            <span>${escapeHtml(viewModel.primaryTask.id)} · ${escapeHtml(viewModel.primaryTask.status)}</span>
          </div>
          <span>${viewModel.primaryTask.pendingApprovalCount} 个审批</span>
        </div>
      ` : "<p>暂无任务</p>"}
    </section>
    <section class="panel">
      <h2>待审批</h2>
      ${viewModel.pendingApprovals.map((approval) => `
        <div class="approval-row">
          <strong>${escapeHtml(approval.tool)}</strong>
          <span>${escapeHtml(approval.reason)}</span>
        </div>
      `).join("")}
    </section>
  `;
}

function stateLabel(state: RenderState): string {
  if (state === "ready") {
    return "已连接 API";
  }
  if (state === "error") {
    return "连接异常";
  }
  return "加载中";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
