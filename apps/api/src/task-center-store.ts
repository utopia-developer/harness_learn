import type {
  CreateTaskRequest,
  ListTasksQuery,
  ListTasksResponse,
  MetricsSummaryResponse,
  ReleaseSummaryResponse,
  TaskCenterTaskDto,
  TaskSortKey,
  TaskStatus
} from "../../../packages/contracts/src/index.js";
import { createDemoConsoleDashboard } from "./dashboard-fixture.js";

const timestamp = "2026-07-10T00:00:00.000Z";

export type TaskCenterStore = {
  listTasks(query?: ListTasksQuery): ListTasksResponse;
  createTask(input: CreateTaskRequest): TaskCenterTaskDto;
  getReleaseSummary(): ReleaseSummaryResponse;
  getMetricsSummary(): MetricsSummaryResponse;
};

export function createTaskCenterStore(seed = createSeedTasks()): TaskCenterStore {
  const tasks = [...seed];
  let sequence = tasks.length + 1;

  return {
    listTasks(query = {}) {
      const filters = normalizeQuery(query);
      const filtered = sortTasks(
        tasks.filter((task) => matchesStatus(task, filters.status))
          .filter((task) => matchesSearch(task, filters.search)),
        filters.sort
      );

      return {
        tasks: filtered.map(cloneTask),
        total: filtered.length,
        filters
      };
    },
    createTask(input) {
      const now = new Date().toISOString();
      const task: TaskCenterTaskDto = {
        id: `task-${sequence++}`,
        projectId: input.projectId,
        userId: input.userId,
        goal: input.goal,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        traceCount: 0,
        pendingApprovalCount: 0,
        releaseGateStatus: "not_applicable",
        costUsd: 0
      };
      tasks.unshift(task);
      return cloneTask(task);
    },
    getReleaseSummary() {
      return {
        ready: tasks.filter((task) => task.releaseGateStatus === "ready").length,
        blocked: tasks.filter((task) => task.releaseGateStatus === "blocked").length,
        warning: tasks.filter((task) => task.releaseGateStatus === "warning").length
      };
    },
    getMetricsSummary() {
      return {
        activeTasks: tasks.filter((task) => task.status === "running").length,
        waitingApprovalTasks: tasks.filter((task) => task.status === "waiting_approval").length,
        costTodayUsd: Number(tasks.reduce((sum, task) => sum + task.costUsd, 0).toFixed(2))
      };
    }
  };
}

function createSeedTasks(): TaskCenterTaskDto[] {
  const dashboard = createDemoConsoleDashboard();
  const demoTask = dashboard.tasks[0];

  return [
    {
      id: demoTask.id,
      projectId: demoTask.projectId,
      userId: "user-demo",
      goal: demoTask.goal,
      status: demoTask.status,
      createdAt: timestamp,
      updatedAt: demoTask.updatedAt,
      traceCount: demoTask.traceCount,
      pendingApprovalCount: demoTask.pendingApprovalCount,
      releaseGateStatus: "blocked",
      costUsd: 1.2
    },
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
  ];
}

function normalizeQuery(query: ListTasksQuery): Required<ListTasksQuery> {
  return {
    status: query.status ?? "all",
    search: query.search?.trim() ?? "",
    sort: query.sort ?? "updated_desc"
  };
}

function matchesStatus(task: TaskCenterTaskDto, status: TaskStatus | "all"): boolean {
  return status === "all" || task.status === status;
}

function matchesSearch(task: TaskCenterTaskDto, search: string): boolean {
  if (!search) {
    return true;
  }
  const needle = search.toLocaleLowerCase();
  return `${task.id} ${task.goal} ${task.projectId}`.toLocaleLowerCase().includes(needle);
}

function sortTasks(tasks: TaskCenterTaskDto[], sort: TaskSortKey): TaskCenterTaskDto[] {
  const sorted = [...tasks];
  if (sort === "updated_asc") {
    return sorted.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
  }
  if (sort === "status_asc") {
    return sorted.sort((left, right) => left.status.localeCompare(right.status));
  }
  if (sort === "goal_asc") {
    return sorted.sort((left, right) => left.goal.localeCompare(right.goal));
  }
  return sorted.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function cloneTask(task: TaskCenterTaskDto): TaskCenterTaskDto {
  return { ...task };
}
