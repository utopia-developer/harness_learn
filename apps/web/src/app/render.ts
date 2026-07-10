import type { ApiClient } from "../shared/api/client.js";
import { WEB_NAVIGATION } from "./navigation.js";
import { createDashboardViewModel } from "../features/console/dashboard-view-model.js";

export async function renderApp(root: HTMLElement, client: ApiClient): Promise<void> {
  root.innerHTML = renderShell("loading");

  try {
    const dashboard = await client.getConsoleDashboard();
    const viewModel = createDashboardViewModel(dashboard);
    root.innerHTML = renderShell("ready", viewModel);
  } catch (error) {
    root.innerHTML = renderShell("error", undefined, error);
  }
}

type RenderState = "loading" | "ready" | "error";

function renderShell(
  state: RenderState,
  viewModel?: ReturnType<typeof createDashboardViewModel>,
  error?: unknown
): string {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">Harness Console</div>
        <nav class="nav">${WEB_NAVIGATION.map((item) =>
          `<a href="${item.href}">${item.label}</a>`
        ).join("")}</nav>
      </aside>
      <main class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">F0 Console</p>
            <h1>Agent Harness 运行工作台</h1>
          </div>
          <span class="status-pill">${stateLabel(state)}</span>
        </header>
        ${renderContent(state, viewModel, error)}
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
    return `<section class="panel"><p>正在加载运行数据...</p></section>`;
  }

  if (state === "error") {
    return `
      <section class="panel error-panel">
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
      <article><span>任务</span><strong>${viewModel.totalTasks}</strong></article>
      <article><span>待审批</span><strong>${viewModel.pendingApprovalCount}</strong></article>
      <article><span>运行 Trace</span><strong>${viewModel.runningTraceCount}</strong></article>
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
