import test from "node:test";
import assert from "node:assert/strict";

import { renderAppHtml } from "../../apps/web/src/app/render.js";

test("tasks page renders task center controls, health summary and task rows", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/tasks",
    taskCenter: {
      tasks: {
        tasks: [
          {
            id: "task-running-demo",
            projectId: "project-harness",
            userId: "user-demo",
            goal: "运行 Task Center 数据刷新",
            status: "running",
            createdAt: "2026-07-10T00:02:00.000Z",
            updatedAt: "2026-07-10T00:06:00.000Z",
            traceCount: 2,
            pendingApprovalCount: 0,
            releaseGateStatus: "ready",
            costUsd: 1.22
          }
        ],
        total: 1,
        filters: {
          status: "running",
          search: "Task Center",
          sort: "updated_desc"
        }
      },
      releaseSummary: {
        ready: 1,
        blocked: 1,
        warning: 0
      },
      metricsSummary: {
        activeTasks: 1,
        waitingApprovalTasks: 1,
        costTodayUsd: 2.42
      }
    }
  });

  assert.match(html, /<form class="task-create-form"/);
  assert.match(html, /name="goal"/);
  assert.match(html, /name="status"/);
  assert.match(html, /name="search"/);
  assert.match(html, /name="sort"/);
  assert.match(html, /运行 Task Center 数据刷新/);
  assert.match(html, /运行中/);
  assert.match(html, /href="\/tasks\/task-running-demo\/runs\/latest"/);
  assert.match(html, /\$2.42/);
});
