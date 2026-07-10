import test from "node:test";
import assert from "node:assert/strict";

import {
  createTaskCenterViewModel,
  getTaskStatusPresentation
} from "../../apps/web/src/features/tasks/task-center-view-model.js";

test("task center view model combines tasks with health summaries", () => {
  const viewModel = createTaskCenterViewModel({
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
  });

  assert.equal(viewModel.health.activeTasks.value, "1");
  assert.equal(viewModel.health.waitingApprovalTasks.value, "1");
  assert.equal(viewModel.health.releaseGates.value, "1 blocked");
  assert.equal(viewModel.health.costToday.value, "$2.42");
  assert.equal(viewModel.rows[0].detailHref, "/tasks/task-running-demo/runs/latest");
  assert.equal(viewModel.filters.status, "running");
});

test("task status presentation clearly distinguishes key statuses", () => {
  assert.deepEqual(getTaskStatusPresentation("pending"), {
    label: "Pending",
    tone: "pending"
  });
  assert.deepEqual(getTaskStatusPresentation("running"), {
    label: "Running",
    tone: "running"
  });
  assert.deepEqual(getTaskStatusPresentation("waiting_approval"), {
    label: "Waiting approval",
    tone: "waitingApproval"
  });
  assert.deepEqual(getTaskStatusPresentation("completed"), {
    label: "Completed",
    tone: "completed"
  });
  assert.deepEqual(getTaskStatusPresentation("failed"), {
    label: "Failed",
    tone: "failed"
  });
});
