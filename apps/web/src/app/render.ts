import type { ConsoleDashboardResponse } from "../../../../packages/contracts/src/index.js";
import type {
  ListTasksResponse,
  MetricsSummaryResponse,
  ReleaseSummaryResponse,
  TaskStatus
} from "../../../../packages/contracts/src/index.js";
import {
  createLoadingState,
  createMetricCard
} from "../design-system/index.js";
import type { ApiClient } from "../shared/api/client.js";
import { createDashboardViewModel } from "../features/console/dashboard-view-model.js";
import { createTaskRequestFromFormData } from "../features/tasks/task-create-form.js";
import { createTaskCenterViewModel } from "../features/tasks/task-center-view-model.js";
import { createAppShellViewModel } from "./shell.js";

export async function renderApp(root: HTMLElement, client: ApiClient): Promise<void> {
  const pathname = root.ownerDocument.location?.pathname ?? "/";
  root.innerHTML = renderAppHtml({
    state: "loading",
    pathname
  });

  try {
    if (pathname.startsWith("/tasks")) {
      const [tasks, releaseSummary, metricsSummary] = await Promise.all([
        client.listTasks(),
        client.getReleaseSummary(),
        client.getMetricsSummary()
      ]);
      root.innerHTML = renderAppHtml({
        state: "ready",
        pathname,
        taskCenter: {
          tasks,
          releaseSummary,
          metricsSummary
        }
      });
      bindTaskCreateForm(root, client, pathname);
      return;
    }

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

function bindTaskCreateForm(root: HTMLElement, client: ApiClient, pathname: string): void {
  const form = root.querySelector<HTMLFormElement>(".task-create-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void (async () => {
      await client.createTask(createTaskRequestFromFormData(new FormData(form)));
      const [tasks, releaseSummary, metricsSummary] = await Promise.all([
        client.listTasks(),
        client.getReleaseSummary(),
        client.getMetricsSummary()
      ]);
      root.innerHTML = renderAppHtml({
        state: "ready",
        pathname,
        taskCenter: {
          tasks,
          releaseSummary,
          metricsSummary
        }
      });
      bindTaskCreateForm(root, client, pathname);
    })();
  });
}

export type RenderState = "loading" | "ready" | "error";

export type RenderAppHtmlInput = {
  state: RenderState;
  pathname: string;
  dashboard?: ConsoleDashboardResponse;
  taskCenter?: {
    tasks: ListTasksResponse;
    releaseSummary: ReleaseSummaryResponse;
    metricsSummary: MetricsSummaryResponse;
  };
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
        ${renderContent(input.state, {
          dashboard: viewModel,
          taskCenter: input.taskCenter,
          error: input.error
        })}
      </main>
    </div>
  `;
}

function renderContent(
  state: RenderState,
  content: {
    dashboard?: ReturnType<typeof createDashboardViewModel>;
    taskCenter?: NonNullable<RenderAppHtmlInput["taskCenter"]>;
    error?: unknown;
  }
): string {
  if (state === "loading") {
    const loading = createLoadingState("正在加载运行数据...");
    return `<section class="panel" aria-live="${loading.ariaLive}"><p>${loading.label}</p></section>`;
  }

  if (state === "error") {
    return `
      <section class="panel error-panel" role="alert">
        <h2>无法加载 Console Dashboard</h2>
        <p>${escapeHtml(content.error instanceof Error ? content.error.message : String(content.error))}</p>
      </section>
    `;
  }

  if (content.taskCenter) {
    return renderTaskCenterContent(content.taskCenter);
  }

  if (!content.dashboard) {
    return "";
  }

  const viewModel = content.dashboard;
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

function renderTaskCenterContent(
  taskCenter: NonNullable<RenderAppHtmlInput["taskCenter"]>
): string {
  const viewModel = createTaskCenterViewModel(taskCenter);

  return `
    <section class="metrics-grid">
      ${Object.values(viewModel.health).map((metric) =>
        `<article><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></article>`
      ).join("")}
    </section>
    <section class="panel task-toolbar">
      <form class="task-filter-form" method="get" action="/tasks" aria-label="任务筛选">
        <label>
          状态
          <select name="status">
            ${renderStatusOptions(viewModel.filters.status)}
          </select>
        </label>
        <label>
          搜索
          <input name="search" value="${escapeHtml(viewModel.filters.search)}" placeholder="搜索任务目标或项目" />
        </label>
        <label>
          排序
          <select name="sort">
            ${renderSortOptions(viewModel.filters.sort)}
          </select>
        </label>
        <button type="submit">应用</button>
      </form>
    </section>
    <section class="panel task-create-drawer" aria-label="新建任务">
      <h2>新建任务</h2>
      <form class="task-create-form" method="post" action="/api/v1/tasks">
        <label>
          目标
          <textarea name="goal" rows="3" required placeholder="描述希望 Agent 完成的任务"></textarea>
        </label>
        <label>
          项目
          <input name="projectId" value="project-harness" required />
        </label>
        <input type="hidden" name="userId" value="user-demo" />
        <button type="submit">创建任务</button>
      </form>
    </section>
    <section class="panel">
      <h2>任务列表</h2>
      ${viewModel.empty ? "<p>没有匹配的任务</p>" : `
        <table class="task-table">
          <caption>任务列表</caption>
          <thead>
            <tr>
              <th scope="col">目标</th>
              <th scope="col">状态</th>
              <th scope="col">审批</th>
              <th scope="col">Release</th>
              <th scope="col">成本</th>
              <th scope="col">详情</th>
            </tr>
          </thead>
          <tbody>
            ${viewModel.rows.map((row) => `
              <tr>
                <td>
                  <strong>${escapeHtml(row.goal)}</strong>
                  <span>${escapeHtml(row.projectId)} · ${escapeHtml(row.updatedAt)}</span>
                </td>
                <td><span class="badge badge-${escapeHtml(row.status.tone)}">${escapeHtml(row.status.label)}</span></td>
                <td>${row.pendingApprovalCount}</td>
                <td><span class="badge badge-${escapeHtml(row.releaseGateStatus.tone)}">${escapeHtml(row.releaseGateStatus.label)}</span></td>
                <td>${escapeHtml(row.costUsd)}</td>
                <td><a href="${row.detailHref}">查看</a></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
    </section>
  `;
}

function renderStatusOptions(current: TaskStatus | "all"): string {
  const options: Array<{ value: TaskStatus | "all"; label: string }> = [
    { value: "all", label: "全部" },
    { value: "pending", label: "Pending" },
    { value: "running", label: "Running" },
    { value: "waiting_approval", label: "Waiting approval" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" }
  ];
  return options.map((option) =>
    `<option value="${option.value}"${option.value === current ? " selected" : ""}>${option.label}</option>`
  ).join("");
}

function renderSortOptions(current: string): string {
  const options = [
    { value: "updated_desc", label: "最近更新" },
    { value: "updated_asc", label: "最早更新" },
    { value: "status_asc", label: "状态" },
    { value: "goal_asc", label: "目标" }
  ];
  return options.map((option) =>
    `<option value="${option.value}"${option.value === current ? " selected" : ""}>${option.label}</option>`
  ).join("");
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
