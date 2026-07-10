import {
  WEB_ROUTES,
  type ListTasksQuery,
  type ListTasksResponse,
  type MetricsSummaryResponse,
  type ReleaseSummaryResponse,
  type TaskCenterTaskDto,
  type TaskStatus
} from "../../../../../packages/contracts/src/index.js";
import {
  createBadge,
  createMetricCard,
  type BadgeViewModel,
  type MetricCardViewModel,
  type StatusTone
} from "../../design-system/index.js";

export type TaskCenterViewModelInput = {
  tasks: ListTasksResponse;
  releaseSummary: ReleaseSummaryResponse;
  metricsSummary: MetricsSummaryResponse;
};

export type TaskCenterRowViewModel = {
  id: string;
  goal: string;
  projectId: string;
  status: BadgeViewModel;
  releaseGateStatus: BadgeViewModel;
  updatedAt: string;
  traceCount: number;
  pendingApprovalCount: number;
  costUsd: string;
  detailHref: string;
};

export type TaskCenterViewModel = {
  health: {
    activeTasks: MetricCardViewModel;
    waitingApprovalTasks: MetricCardViewModel;
    releaseGates: MetricCardViewModel;
    costToday: MetricCardViewModel;
  };
  rows: TaskCenterRowViewModel[];
  filters: Required<ListTasksQuery>;
  total: number;
  empty: boolean;
};

export function createTaskCenterViewModel(
  input: TaskCenterViewModelInput
): TaskCenterViewModel {
  return {
    health: {
      activeTasks: createMetricCard({
        label: "Active",
        value: input.metricsSummary.activeTasks
      }),
      waitingApprovalTasks: createMetricCard({
        label: "Waiting approval",
        value: input.metricsSummary.waitingApprovalTasks
      }),
      releaseGates: createMetricCard({
        label: "Release gates",
        value: `${input.releaseSummary.blocked} blocked`
      }),
      costToday: createMetricCard({
        label: "Cost today",
        value: `$${input.metricsSummary.costTodayUsd.toFixed(2)}`
      })
    },
    rows: input.tasks.tasks.map(createTaskRowViewModel),
    filters: input.tasks.filters,
    total: input.tasks.total,
    empty: input.tasks.total === 0
  };
}

export function getTaskStatusPresentation(status: TaskStatus): {
  label: string;
  tone: StatusTone;
} {
  const presentations: Record<TaskStatus, { label: string; tone: StatusTone }> = {
    pending: { label: "Pending", tone: "pending" },
    planning: { label: "Planning", tone: "planning" },
    running: { label: "Running", tone: "running" },
    waiting_approval: { label: "Waiting approval", tone: "waitingApproval" },
    completed: { label: "Completed", tone: "completed" },
    failed: { label: "Failed", tone: "failed" },
    cancelled: { label: "Cancelled", tone: "cancelled" }
  };
  return presentations[status];
}

function createTaskRowViewModel(task: TaskCenterTaskDto): TaskCenterRowViewModel {
  const status = getTaskStatusPresentation(task.status);
  return {
    id: task.id,
    goal: task.goal,
    projectId: task.projectId,
    status: createBadge({
      label: status.label,
      tone: status.tone
    }),
    releaseGateStatus: createBadge({
      label: releaseGateLabel(task.releaseGateStatus),
      tone: task.releaseGateStatus === "blocked" ? "danger" : "success"
    }),
    updatedAt: task.updatedAt,
    traceCount: task.traceCount,
    pendingApprovalCount: task.pendingApprovalCount,
    costUsd: `$${task.costUsd.toFixed(2)}`,
    detailHref: WEB_ROUTES.runDetail(task.id, "latest")
  };
}

function releaseGateLabel(status: TaskCenterTaskDto["releaseGateStatus"]): string {
  if (status === "ready") {
    return "Ready";
  }
  if (status === "blocked") {
    return "Blocked";
  }
  if (status === "warning") {
    return "Warning";
  }
  return "N/A";
}
