import type {
  ApprovalActionRequest,
  ApprovalActionResponse,
  ApprovalDto,
  ApprovalQueueResponse,
  ApprovalStatus,
  ApplyPolicySuggestionResponse,
  PolicySuggestionDto
} from "../../../packages/contracts/src/index.js";

export type ApprovalQueueStore = {
  getApproval(approvalId: string): ApprovalDto | undefined;
  listApprovals(status?: ApprovalStatus | "all"): ApprovalQueueResponse;
  approve(approvalId: string, input?: ApprovalActionRequest): ApprovalActionResponse | undefined;
  deny(approvalId: string, input?: ApprovalActionRequest): ApprovalActionResponse | undefined;
  applySuggestion(suggestionId: string): ApplyPolicySuggestionResponse | undefined;
};

export function createApprovalQueueStore(seed = createSeedApprovals()): ApprovalQueueStore {
  const approvals = seed.map(cloneApproval);

  return {
    getApproval(approvalId) {
      const approval = approvals.find((item) => item.id === approvalId);
      return approval ? cloneApproval(approval) : undefined;
    },
    listApprovals(status = "pending") {
      const filtered = approvals.filter((approval) =>
        status === "all" ? true : approval.status === status
      );
      return {
        approvals: filtered.map(cloneApproval),
        total: filtered.length,
        filters: { status }
      };
    },
    approve(approvalId, input = {}) {
      return decide(approvals, approvalId, "approved", input.reason);
    },
    deny(approvalId, input = {}) {
      return decide(approvals, approvalId, "denied", input.reason);
    },
    applySuggestion(suggestionId) {
      for (const approval of approvals) {
        const suggestion = approval.suggestions.find((item) => item.id === suggestionId);
        if (suggestion) {
          suggestion.status = "applied";
          return { suggestion: { ...suggestion } };
        }
      }
      return undefined;
    }
  };
}

function decide(
  approvals: ApprovalDto[],
  approvalId: string,
  status: "approved" | "denied",
  reason?: string
): ApprovalActionResponse | undefined {
  const approval = approvals.find((item) => item.id === approvalId);
  if (!approval) {
    return undefined;
  }
  approval.status = status;
  approval.reason = reason?.trim() || approval.reason;

  return {
    approval: cloneApproval(approval),
    runEffect: {
      runId: approval.runId,
      status: status === "approved" ? "continues" : "failed",
      message: status === "approved"
        ? "审批已通过，运行可以继续。"
        : "审批已拒绝，运行已标记为失败。"
    }
  };
}

function createSeedApprovals(): ApprovalDto[] {
  return [
    {
      id: "approval-run-command",
      taskId: "task-f0-demo",
      runId: "run-f0-demo",
      traceId: "trace-f0-demo",
      callId: "tool-call-f0",
      tool: "run_command",
      mode: "default",
      reason: "Tool run_command 需要审批",
      requestedAt: "2026-07-10T00:00:00.000Z",
      status: "pending",
      input: { cmd: "npm test" },
      risk: {
        level: "high",
        explanation: "Shell 命令可能修改文件、触发网络调用或泄露敏感信息。",
        factors: ["高风险工具", "命令执行", "工作区访问"]
      },
      suggestions: [
        suggestion(
          "suggestion-allow-npm-test",
          "允许在 project-harness 中执行 npm test",
          "人工审批后允许重复执行 npm test 命令。"
        )
      ]
    },
    {
      id: "approval-write-file",
      taskId: "task-write-demo",
      runId: "run-write-demo",
      traceId: "trace-write-demo",
      callId: "tool-call-write",
      tool: "write_file",
      mode: "default",
      reason: "文件写入需要复核",
      requestedAt: "2026-07-10T00:01:00.000Z",
      status: "pending",
      input: { path: "README.md", content: "updated" },
      risk: {
        level: "medium",
        explanation: "文件写入会改变仓库状态，需要先完成复核。",
        factors: ["文件变更", "仓库状态"]
      },
      suggestions: [
        suggestion(
          "suggestion-allow-readme-write",
          "允许 README 更新",
          "允许在 project-harness 中执行低风险 README 编辑。"
        )
      ]
    }
  ];
}

function suggestion(id: string, title: string, description: string): PolicySuggestionDto {
  return {
    id,
    title,
    description,
    status: "pending"
  };
}

function cloneApproval(approval: ApprovalDto): ApprovalDto {
  return {
    ...approval,
    risk: {
      ...approval.risk,
      factors: [...approval.risk.factors]
    },
    suggestions: approval.suggestions.map((suggestion) => ({ ...suggestion }))
  };
}
