import type { ConsoleDashboardResponse } from "../../../../packages/contracts/src/index.js";
import type {
  ApprovalQueueResponse,
  ListReleasesResponse,
  ListTasksResponse,
  MetricsSummaryResponse,
  PolicySimulationResponse,
  ProjectPolicyResponse,
  ReleaseReadinessResponse,
  ReleaseSummaryResponse,
  RunTraceResponse,
  TeamPluginsResponse,
  TaskStatus
} from "../../../../packages/contracts/src/index.js";
import {
  createLoadingState,
  createMetricCard
} from "../design-system/index.js";
import type { ApiClient } from "../shared/api/client.js";
import { createApprovalQueueViewModel } from "../features/approvals/approval-queue-view-model.js";
import { createDashboardViewModel } from "../features/console/dashboard-view-model.js";
import { createReleaseReadinessViewModel } from "../features/releases/release-readiness-view-model.js";
import { createRunDetailViewModel } from "../features/runs/run-detail-view-model.js";
import { createPluginsViewModel } from "../features/settings/plugins-view-model.js";
import { createPolicyViewModel } from "../features/settings/policy-view-model.js";
import { createTaskRequestFromFormData } from "../features/tasks/task-create-form.js";
import { createTaskCenterViewModel } from "../features/tasks/task-center-view-model.js";
import { createAppShellViewModel } from "./shell.js";

const defaultProjectId = "project-harness";
const defaultTeamId = "team-platform";

export async function renderApp(root: HTMLElement, client: ApiClient): Promise<void> {
  const pathname = root.ownerDocument.location?.pathname ?? "/";
  root.innerHTML = renderAppHtml({
    state: "loading",
    pathname
  });

  try {
    if (pathname.startsWith("/approvals")) {
      const approvalQueue = await client.listApprovals({ status: "pending" });
      root.innerHTML = renderAppHtml({
        state: "ready",
        pathname,
        approvalQueue
      });
      bindApprovalForms(root, client, pathname);
      return;
    }

    if (pathname.startsWith("/releases")) {
      const releases = await client.listReleases();
      const releaseId = parseReleasePath(pathname) ?? releases.releases[0]?.id;
      const readiness = releaseId
        ? await client.getReleaseReadiness(releaseId)
        : undefined;
      root.innerHTML = renderAppHtml({
        state: "ready",
        pathname,
        releaseReadiness: readiness ? { releases, readiness } : undefined
      });
      bindReleaseForms(root, client, pathname);
      return;
    }

    if (pathname.startsWith("/settings/policy")) {
      const policy = await client.getProjectPolicy(defaultProjectId);
      root.innerHTML = renderAppHtml({
        state: "ready",
        pathname,
        policySettings: {
          policy
        }
      });
      bindPolicyForms(root, client, pathname);
      return;
    }

    if (pathname.startsWith("/settings/plugins")) {
      const pluginsSettings = await client.listTeamPlugins(defaultTeamId);
      root.innerHTML = renderAppHtml({
        state: "ready",
        pathname,
        pluginsSettings
      });
      bindPluginForms(root, client, pathname);
      return;
    }

    const runPath = parseRunPath(pathname);
    if (runPath) {
      const trace = await client.getRunTrace(runPath.taskId, runPath.runId);
      root.innerHTML = renderAppHtml({
        state: "ready",
        pathname,
        runDetail: { trace }
      });
      return;
    }

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
  runDetail?: {
    trace: RunTraceResponse;
    selectedEventId?: string;
  };
  approvalQueue?: ApprovalQueueResponse;
  releaseReadiness?: {
    releases: ListReleasesResponse;
    readiness: ReleaseReadinessResponse;
  };
  policySettings?: {
    policy: ProjectPolicyResponse;
    simulation?: PolicySimulationResponse;
  };
  pluginsSettings?: TeamPluginsResponse;
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
          runDetail: input.runDetail,
          approvalQueue: input.approvalQueue,
          releaseReadiness: input.releaseReadiness,
          policySettings: input.policySettings,
          pluginsSettings: input.pluginsSettings,
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
    runDetail?: NonNullable<RenderAppHtmlInput["runDetail"]>;
    approvalQueue?: ApprovalQueueResponse;
    releaseReadiness?: NonNullable<RenderAppHtmlInput["releaseReadiness"]>;
    policySettings?: NonNullable<RenderAppHtmlInput["policySettings"]>;
    pluginsSettings?: TeamPluginsResponse;
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

  if (content.runDetail) {
    return renderRunDetailContent(content.runDetail);
  }

  if (content.approvalQueue) {
    return renderApprovalQueueContent(content.approvalQueue);
  }

  if (content.releaseReadiness) {
    return renderReleaseReadinessContent(content.releaseReadiness);
  }

  if (content.policySettings) {
    return renderPolicySettingsContent(content.policySettings);
  }

  if (content.pluginsSettings) {
    return renderPluginsSettingsContent(content.pluginsSettings);
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

function bindPolicyForms(root: HTMLElement, client: ApiClient, pathname: string): void {
  root.querySelectorAll<HTMLFormElement>("[data-policy-action]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const action = form.dataset.policyAction;
        const formData = new FormData(form);
        let simulation: PolicySimulationResponse | undefined;

        if (action === "update") {
          await client.updateProjectPolicy(defaultProjectId, {
            allowedTools: formData.getAll("allowedTools").map(String),
            allowedModels: formData.getAll("allowedModels").map(String)
          });
        } else if (action === "simulate") {
          simulation = await client.simulateProjectPolicy(defaultProjectId, {
            tool: String(formData.get("tool") ?? ""),
            model: String(formData.get("model") ?? "")
          });
        }

        const policy = await client.getProjectPolicy(defaultProjectId);
        root.innerHTML = renderAppHtml({
          state: "ready",
          pathname,
          policySettings: {
            policy,
            simulation
          }
        });
        bindPolicyForms(root, client, pathname);
      })();
    });
  });
}

function bindPluginForms(root: HTMLElement, client: ApiClient, pathname: string): void {
  root.querySelectorAll<HTMLFormElement>("[data-plugin-action]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const pluginId = form.dataset.pluginId ?? "";
        const action = form.dataset.pluginAction;

        if (action === "install") {
          await client.installTeamPlugin(defaultTeamId, pluginId);
        } else if (action === "enable") {
          await client.enableTeamPlugin(defaultTeamId, pluginId);
        } else if (action === "disable") {
          await client.disableTeamPlugin(defaultTeamId, pluginId);
        }

        const pluginsSettings = await client.listTeamPlugins(defaultTeamId);
        root.innerHTML = renderAppHtml({
          state: "ready",
          pathname,
          pluginsSettings
        });
        bindPluginForms(root, client, pathname);
      })();
    });
  });
}

function bindReleaseForms(root: HTMLElement, client: ApiClient, pathname: string): void {
  root.querySelectorAll<HTMLFormElement>("[data-release-action]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const releaseId = form.dataset.releaseId ?? "";
        await client.runReleaseGate(releaseId);
        const [releases, readiness] = await Promise.all([
          client.listReleases(),
          client.getReleaseReadiness(releaseId)
        ]);
        root.innerHTML = renderAppHtml({
          state: "ready",
          pathname,
          releaseReadiness: {
            releases,
            readiness
          }
        });
        bindReleaseForms(root, client, pathname);
      })();
    });
  });
}

function bindApprovalForms(root: HTMLElement, client: ApiClient, pathname: string): void {
  root.querySelectorAll<HTMLFormElement>("[data-approval-action]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const action = form.dataset.approvalAction;
        const approvalId = form.dataset.approvalId ?? "";
        const suggestionId = form.dataset.suggestionId ?? "";
        const reason = String(new FormData(form).get("reason") ?? "");

        if (action === "approve") {
          await client.approveApproval(approvalId, { reason });
        } else if (action === "deny") {
          await client.denyApproval(approvalId, { reason });
        } else if (action === "apply-suggestion") {
          await client.applyPolicySuggestion(suggestionId);
        }

        const approvalQueue = await client.listApprovals({ status: "pending" });
        root.innerHTML = renderAppHtml({
          state: "ready",
          pathname,
          approvalQueue
        });
        bindApprovalForms(root, client, pathname);
      })();
    });
  });
}

function renderRunDetailContent(
  runDetail: NonNullable<RenderAppHtmlInput["runDetail"]>
): string {
  const viewModel = createRunDetailViewModel(
    runDetail.trace,
    runDetail.selectedEventId
  );

  return `
    <section class="metrics-grid">
      <article><span>Run</span><strong>${escapeHtml(viewModel.header.runId)}</strong></article>
      <article><span>Status</span><strong>${escapeHtml(viewModel.header.status.label)}</strong></article>
      <article><span>Events</span><strong>${viewModel.header.eventCount}</strong></article>
    </section>
    ${viewModel.failure ? `
      <section class="panel failure-panel" role="alert">
        <h2>Failure module</h2>
        <p><strong>${escapeHtml(viewModel.failure.module)}</strong> · ${escapeHtml(viewModel.failure.message)}</p>
      </section>
    ` : ""}
    <section class="run-detail-grid">
      <div class="panel">
        <h2>Trace Timeline</h2>
        <ol class="timeline">
          ${viewModel.timeline.map((event) => `
            <li class="timeline-item timeline-${escapeHtml(event.severity)}${event.selected ? " is-selected" : ""}">
              <div>
                <span class="timeline-sequence">${event.sequence}</span>
                <strong>${escapeHtml(event.title)}</strong>
                <p>${escapeHtml(event.summary)}</p>
                <span>${escapeHtml(event.timestamp)} · ${escapeHtml(event.kind)}</span>
              </div>
              ${event.hasOutputRef && event.outputRefHref
                ? `<a href="${event.outputRefHref}">查看输出引用</a>`
                : ""}
            </li>
          `).join("")}
        </ol>
      </div>
      <aside class="panel event-detail" aria-label="Event Detail Panel">
        <h2>Event Detail Panel</h2>
        ${viewModel.selectedEvent ? `
          <dl>
            <dt>Type</dt>
            <dd>${escapeHtml(viewModel.selectedEvent.type)}</dd>
            <dt>Summary</dt>
            <dd>${escapeHtml(viewModel.selectedEvent.summary)}</dd>
            ${viewModel.selectedEvent.tool ? `
              <dt>Tool</dt>
              <dd>${escapeHtml(viewModel.selectedEvent.tool)}</dd>
            ` : ""}
            ${viewModel.selectedEvent.inputJson ? `
              <dt>Input</dt>
              <dd><pre><code>${escapeHtml(viewModel.selectedEvent.inputJson)}</code></pre></dd>
            ` : ""}
            ${viewModel.selectedEvent.outputRefHref ? `
              <dt>Output ref</dt>
              <dd><a href="${viewModel.selectedEvent.outputRefHref}">${escapeHtml(viewModel.selectedEvent.outputRef ?? "")}</a></dd>
            ` : ""}
          </dl>
        ` : "<p>请选择一个事件</p>"}
        <a class="replay-link" href="${viewModel.replayCaseHref}">Replay Case</a>
      </aside>
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

function renderApprovalQueueContent(approvalQueue: ApprovalQueueResponse): string {
  const viewModel = createApprovalQueueViewModel(approvalQueue);

  return `
    <section class="metrics-grid">
      <article><span>Pending approvals</span><strong>${viewModel.totalPending}</strong></article>
      <article><span>Selected</span><strong>${viewModel.selectedApproval ? "1" : "0"}</strong></article>
      <article><span>Risk review</span><strong>${viewModel.selectedApproval?.risk.label ?? "None"}</strong></article>
    </section>
    <section class="approval-layout">
      <div class="panel">
        <h2>Approval Queue</h2>
        ${viewModel.empty ? "<p>暂无待审批项</p>" : `
          <ul class="approval-list">
            ${viewModel.items.map((item) => `
              <li class="approval-list-item${item.selected ? " is-selected" : ""}">
                <div>
                  <strong>${escapeHtml(item.tool)}</strong>
                  <span>${escapeHtml(item.taskId)} · ${escapeHtml(item.runId)}</span>
                  <p>${escapeHtml(item.reason)}</p>
                </div>
                <span class="badge badge-${escapeHtml(item.risk.tone)}">${escapeHtml(item.risk.label)}</span>
              </li>
            `).join("")}
          </ul>
        `}
      </div>
      <aside class="panel approval-detail" aria-label="审批详情">
        ${viewModel.selectedApproval ? `
          <h2>审批详情</h2>
          <section class="risk-card risk-${escapeHtml(viewModel.selectedApproval.risk.level)}">
            <strong>${escapeHtml(viewModel.selectedApproval.risk.label)}</strong>
            <p>${escapeHtml(viewModel.selectedApproval.risk.explanation)}</p>
            <ul>${viewModel.selectedApproval.risk.factors.map((factor) =>
              `<li>${escapeHtml(factor)}</li>`
            ).join("")}</ul>
          </section>
          <dl>
            <dt>Tool</dt>
            <dd>${escapeHtml(viewModel.selectedApproval.tool)}</dd>
            <dt>Reason</dt>
            <dd>${escapeHtml(viewModel.selectedApproval.reason)}</dd>
            <dt>Input</dt>
            <dd><pre><code>${escapeHtml(viewModel.selectedApproval.inputJson)}</code></pre></dd>
          </dl>
          <div class="approval-actions">
            <form method="post" action="/api/v1/approvals/${viewModel.selectedApproval.id}/approve" data-approval-action="approve" data-approval-id="${viewModel.selectedApproval.id}">
              <label>
                处理原因
                <input name="reason" value="Reviewed" />
              </label>
              <button type="submit">${escapeHtml(viewModel.selectedApproval.approveAction.label)}</button>
            </form>
            <form method="post" action="/api/v1/approvals/${viewModel.selectedApproval.id}/deny" data-approval-action="deny" data-approval-id="${viewModel.selectedApproval.id}">
              <label>
                拒绝原因
                <input name="reason" value="Risk too high" />
              </label>
              <button type="submit">${escapeHtml(viewModel.selectedApproval.denyAction.label)}</button>
            </form>
          </div>
          <section class="suggestion-list">
            <h3>规则建议</h3>
            ${viewModel.selectedApproval.suggestions.map((suggestion) => `
              <article class="suggestion-card">
                <strong>${escapeHtml(suggestion.title)}</strong>
                <p>${escapeHtml(suggestion.description)}</p>
                <form method="post" action="/api/v1/policies/suggestions/${suggestion.id}/apply" data-approval-action="apply-suggestion" data-suggestion-id="${suggestion.id}">
                  <button type="submit"${suggestion.applyAction.disabled ? " disabled" : ""}>${escapeHtml(suggestion.applyAction.label)}</button>
                </form>
              </article>
            `).join("")}
          </section>
        ` : "<p>请选择一个审批项</p>"}
      </aside>
    </section>
  `;
}

function renderReleaseReadinessContent(
  releaseReadiness: NonNullable<RenderAppHtmlInput["releaseReadiness"]>
): string {
  const viewModel = createReleaseReadinessViewModel(releaseReadiness);

  return `
    <section class="metrics-grid">
      <article><span>Releases</span><strong>${viewModel.summary.totalReleases}</strong></article>
      <article><span>Ready</span><strong>${viewModel.summary.readyCount}</strong></article>
      <article><span>Blocked</span><strong>${viewModel.summary.blockedCount}</strong></article>
    </section>
    <section class="release-layout">
      <div class="panel">
        <h2>Release Readiness</h2>
        <ul class="release-list">
          ${viewModel.releases.map((release) => `
            <li class="release-list-item${release.selected ? " is-selected" : ""}">
              <div>
                <a href="${release.href}"><strong>${escapeHtml(release.title)}</strong></a>
                <span>${escapeHtml(release.version)} · ${escapeHtml(release.generatedAt)}</span>
              </div>
              <span class="badge badge-${escapeHtml(release.status.tone)}">${escapeHtml(release.status.label)}</span>
            </li>
          `).join("")}
        </ul>
      </div>
      <aside class="panel release-detail" aria-label="发布就绪详情">
        <div class="release-detail-header">
          <div>
            <h2>${escapeHtml(viewModel.selected.title)}</h2>
            <p>${escapeHtml(viewModel.selected.summary)}</p>
          </div>
          <span class="badge badge-${escapeHtml(viewModel.selected.status.tone)}">${escapeHtml(viewModel.selected.status.label)}</span>
        </div>
        <dl class="release-meta">
          <dt>Release</dt>
          <dd>${escapeHtml(viewModel.selected.releaseId)}</dd>
          <dt>Project</dt>
          <dd>${escapeHtml(viewModel.selected.projectId)}</dd>
          <dt>Version</dt>
          <dd>${escapeHtml(viewModel.selected.version)}</dd>
        </dl>
        <form method="post" action="${escapeHtml(viewModel.selected.gateAction.action)}" data-release-action="run-gate" data-release-id="${escapeHtml(viewModel.selected.releaseId)}">
          <button type="submit">${escapeHtml(viewModel.selected.gateAction.label)}</button>
        </form>
        <section class="release-checks">
          <h3>Gate checks</h3>
          ${viewModel.selected.checks.map((check) => `
            <article class="check-row check-${escapeHtml(check.status.tone)}">
              <div>
                <strong>${escapeHtml(check.label)}</strong>
                <p>${escapeHtml(check.detail)}</p>
              </div>
              <span class="badge badge-${escapeHtml(check.status.tone)}">${escapeHtml(check.status.label)}</span>
            </article>
          `).join("")}
        </section>
        <section class="blocker-list">
          <h3>Blocked reasons</h3>
          ${viewModel.selected.blockers.length > 0
            ? `<ul>${viewModel.selected.blockers.map((blocker) =>
              `<li>${escapeHtml(blocker)}</li>`
            ).join("")}</ul>`
            : "<p>No blockers</p>"}
        </section>
        <section class="evidence-table">
          <h3>Evidence</h3>
          <table>
            <caption>Release evidence</caption>
            <tbody>
              <tr>
                <th scope="row">Audit</th>
                <td>${escapeHtml(viewModel.selected.evidence.auditEventCountLabel)}</td>
                <td><a href="${escapeHtml(viewModel.selected.evidence.auditDownloadHref)}">Audit JSONL</a></td>
              </tr>
              <tr>
                <th scope="row">Traces</th>
                <td colspan="2">${viewModel.selected.evidence.traceIds.map(escapeHtml).join(", ")}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </aside>
    </section>
  `;
}

function renderPolicySettingsContent(
  policySettings: NonNullable<RenderAppHtmlInput["policySettings"]>
): string {
  const viewModel = createPolicyViewModel(policySettings);

  return `
    <section class="metrics-grid">
      <article><span>Allowed tools</span><strong>${viewModel.tools.filter((tool) => tool.allowed).length}</strong></article>
      <article><span>Allowed models</span><strong>${viewModel.models.filter((model) => model.allowed).length}</strong></article>
      <article><span>Project</span><strong>${escapeHtml(viewModel.projectId)}</strong></article>
    </section>
    <section class="settings-layout">
      <div class="panel settings-panel">
        <h2>Team Policy</h2>
        <p>${escapeHtml(viewModel.projectName)} · ${escapeHtml(viewModel.teamId)}</p>
        <form method="post" action="${escapeHtml(viewModel.updateAction)}" data-policy-action="update">
          <section class="settings-option-group">
            <h3>工具白名单</h3>
            <div class="settings-options">
              ${viewModel.tools.map((tool) => `
                <label class="check-option">
                  <input type="checkbox" name="allowedTools" value="${escapeHtml(tool.name)}"${tool.allowed ? " checked" : ""} />
                  <span>${escapeHtml(tool.name)}</span>
                </label>
              `).join("")}
            </div>
          </section>
          <section class="settings-option-group">
            <h3>模型白名单</h3>
            <div class="settings-options">
              ${viewModel.models.map((model) => `
                <label class="check-option">
                  <input type="checkbox" name="allowedModels" value="${escapeHtml(model.name)}"${model.allowed ? " checked" : ""} />
                  <span>${escapeHtml(model.name)}</span>
                </label>
              `).join("")}
            </div>
          </section>
          <button type="submit">Save policy</button>
        </form>
      </div>
      <aside class="panel settings-panel" aria-label="策略模拟器">
        <h2>策略模拟器</h2>
        <form class="simulate-form" method="post" action="${escapeHtml(viewModel.simulateAction)}" data-policy-action="simulate">
          <label>
            Tool
            <select name="tool">
              ${viewModel.tools.map((tool) =>
                `<option value="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</option>`
              ).join("")}
            </select>
          </label>
          <label>
            Model
            <select name="model">
              ${viewModel.models.map((model) =>
                `<option value="${escapeHtml(model.name)}">${escapeHtml(model.name)}</option>`
              ).join("")}
            </select>
          </label>
          <button type="submit">Simulate</button>
        </form>
        ${viewModel.simulation ? `
          <section class="simulation-result">
            ${[viewModel.simulation.tool, viewModel.simulation.model].map((decision) => `
              <article class="decision-card decision-${escapeHtml(decision.tone)}">
                <strong>${escapeHtml(decision.name)} · ${escapeHtml(decision.label)}</strong>
                <p>${escapeHtml(decision.reason)}</p>
              </article>
            `).join("")}
          </section>
        ` : "<p>选择工具和模型后运行模拟。</p>"}
      </aside>
    </section>
  `;
}

function renderPluginsSettingsContent(pluginsSettings: TeamPluginsResponse): string {
  const viewModel = createPluginsViewModel(pluginsSettings);

  return `
    <section class="metrics-grid">
      <article><span>Plugins</span><strong>${viewModel.plugins.length}</strong></article>
      <article><span>Enabled</span><strong>${viewModel.plugins.filter((plugin) => plugin.status.label === "Enabled").length}</strong></article>
      <article><span>Shared skills</span><strong>${viewModel.sharedSkills.length}</strong></article>
    </section>
    <section class="settings-layout">
      <div class="panel settings-panel">
        <h2>Plugin Registry</h2>
        <div class="plugin-list">
          ${viewModel.plugins.map((plugin) => `
            <article class="plugin-card">
              <div>
                <h3>${escapeHtml(plugin.name)}</h3>
                <p>${escapeHtml(plugin.id)} · ${escapeHtml(plugin.version)}</p>
              </div>
              <span class="badge badge-${escapeHtml(plugin.status.tone)}">${escapeHtml(plugin.status.label)}</span>
              <dl>
                <dt>Tools</dt>
                <dd>${plugin.tools.map(escapeHtml).join(", ")}</dd>
                <dt>Skills</dt>
                <dd>${plugin.skills.map(escapeHtml).join(", ")}</dd>
              </dl>
              <form method="post" action="${escapeHtml(plugin.primaryAction.action)}" data-plugin-action="${escapeHtml(plugin.primaryAction.actionKind)}" data-plugin-id="${escapeHtml(plugin.id)}">
                <button type="submit">${escapeHtml(plugin.primaryAction.label)}</button>
              </form>
            </article>
          `).join("")}
        </div>
      </div>
      <aside class="panel settings-panel" aria-label="Team shared skills">
        <h2>Team shared skills</h2>
        ${viewModel.sharedSkills.length > 0
          ? `<ul class="skill-list">${viewModel.sharedSkills.map((skill) =>
            `<li>${escapeHtml(skill)}</li>`
          ).join("")}</ul>`
          : "<p>暂无共享 Skill</p>"}
      </aside>
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

function parseRunPath(pathname: string): { taskId: string; runId: string } | undefined {
  const match = pathname.match(/^\/tasks\/([^/]+)\/runs\/([^/]+)$/);
  if (!match) {
    return undefined;
  }
  return {
    taskId: decodeURIComponent(match[1]),
    runId: decodeURIComponent(match[2])
  };
}

function parseReleasePath(pathname: string): string | undefined {
  const match = pathname.match(/^\/releases\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
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
