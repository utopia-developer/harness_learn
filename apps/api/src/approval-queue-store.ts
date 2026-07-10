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
  listApprovals(status?: ApprovalStatus | "all"): ApprovalQueueResponse;
  approve(approvalId: string, input?: ApprovalActionRequest): ApprovalActionResponse | undefined;
  deny(approvalId: string, input?: ApprovalActionRequest): ApprovalActionResponse | undefined;
  applySuggestion(suggestionId: string): ApplyPolicySuggestionResponse | undefined;
};

export function createApprovalQueueStore(seed = createSeedApprovals()): ApprovalQueueStore {
  const approvals = seed.map(cloneApproval);

  return {
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
        ? "Approval accepted; run may continue."
        : "Approval denied; run is marked failed."
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
      reason: "Tool run_command requires approval",
      requestedAt: "2026-07-10T00:00:00.000Z",
      status: "pending",
      input: { cmd: "npm test" },
      risk: {
        level: "high",
        explanation: "Shell command execution can mutate files, run network calls, or leak secrets.",
        factors: ["destructive tool", "command execution", "workspace access"]
      },
      suggestions: [
        suggestion(
          "suggestion-allow-npm-test",
          "Allow npm test for project-harness",
          "Allow repeated npm test commands after manual approval."
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
      reason: "File write requires review",
      requestedAt: "2026-07-10T00:01:00.000Z",
      status: "pending",
      input: { path: "README.md", content: "updated" },
      risk: {
        level: "medium",
        explanation: "File writes can change repository state and should be reviewed.",
        factors: ["file mutation", "repository state"]
      },
      suggestions: [
        suggestion(
          "suggestion-allow-readme-write",
          "Allow README updates",
          "Allow low-risk README edits in project-harness."
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
