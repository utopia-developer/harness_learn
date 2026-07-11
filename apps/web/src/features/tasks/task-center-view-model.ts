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
        label: "活跃任务",
        value: input.metricsSummary.activeTasks
      }),
      waitingApprovalTasks: createMetricCard({
        label: "待审批",
        value: input.metricsSummary.waitingApprovalTasks
      }),
      releaseGates: createMetricCard({
        label: "Release Gate",
        value: `${input.releaseSummary.blocked} 个阻塞`
      }),
      costToday: createMetricCard({
        label: "今日成本",
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
    pending: { label: "待处理", tone: "pending" },
    planning: { label: "规划中", tone: "planning" },
    running: { label: "运行中", tone: "running" },
    waiting_approval: { label: "待审批", tone: "waitingApproval" },
    completed: { label: "已完成", tone: "completed" },
    failed: { label: "失败", tone: "failed" },
    cancelled: { label: "已取消", tone: "cancelled" }
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
    return "就绪";
  }
  if (status === "blocked") {
    return "阻塞";
  }
  if (status === "warning") {
    return "预警";
  }
  return "不适用";
}
