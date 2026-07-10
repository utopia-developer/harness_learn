import type {
  ConsoleDashboardResponse,
  ConsolePendingApprovalDto,
  ConsoleTaskCardDto,
  ConsoleTraceSummaryDto
} from "../../../../../packages/contracts/src/index.js";

export type DashboardViewModel = {
  totalTasks: number;
  pendingApprovalCount: number;
  runningTraceCount: number;
  primaryTask: ConsoleTaskCardDto | undefined;
  tasks: ConsoleTaskCardDto[];
  traces: ConsoleTraceSummaryDto[];
  pendingApprovals: ConsolePendingApprovalDto[];
};

export function createDashboardViewModel(
  dashboard: ConsoleDashboardResponse
): DashboardViewModel {
  return {
    totalTasks: dashboard.tasks.length,
    pendingApprovalCount: dashboard.pendingApprovals.length,
    runningTraceCount: dashboard.traces.filter((trace) => trace.status === "running").length,
    primaryTask: dashboard.tasks[0],
    tasks: dashboard.tasks,
    traces: dashboard.traces,
    pendingApprovals: dashboard.pendingApprovals
  };
}
