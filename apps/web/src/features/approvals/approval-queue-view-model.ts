import type {
  ApprovalDto,
  ApprovalQueueResponse,
  ApprovalRiskLevel,
  PolicySuggestionDto
} from "../../../../../packages/contracts/src/index.js";
import {
  createButton,
  type ButtonViewModel,
  type ComponentTone
} from "../../design-system/index.js";

export type ApprovalRiskPresentation = {
  label: string;
  tone: ComponentTone;
};

export type PolicySuggestionViewModel = PolicySuggestionDto & {
  applyAction: ButtonViewModel;
};

export type ApprovalQueueItemViewModel = {
  id: string;
  tool: string;
  taskId: string;
  runId: string;
  reason: string;
  risk: ApprovalRiskPresentation;
  selected: boolean;
};

export type ApprovalDetailViewModel = ApprovalDto & {
  risk: ApprovalRiskPresentation & ApprovalDto["risk"];
  inputJson: string;
  approveAction: ButtonViewModel;
  denyAction: ButtonViewModel;
  suggestions: PolicySuggestionViewModel[];
};

export type ApprovalQueueViewModel = {
  totalPending: number;
  items: ApprovalQueueItemViewModel[];
  selectedApproval: ApprovalDetailViewModel | undefined;
  empty: boolean;
};

export function createApprovalQueueViewModel(
  response: ApprovalQueueResponse,
  selectedApprovalId = response.approvals[0]?.id
): ApprovalQueueViewModel {
  const selected = response.approvals.find((approval) => approval.id === selectedApprovalId);
  return {
    totalPending: response.approvals.filter((approval) => approval.status === "pending").length,
    items: response.approvals.map((approval) => ({
      id: approval.id,
      tool: approval.tool,
      taskId: approval.taskId,
      runId: approval.runId,
      reason: approval.reason,
      risk: getApprovalRiskPresentation(approval.risk.level),
      selected: approval.id === selectedApprovalId
    })),
    selectedApproval: selected ? toApprovalDetail(selected) : undefined,
    empty: response.approvals.length === 0
  };
}

export function getApprovalRiskPresentation(
  level: ApprovalRiskLevel
): ApprovalRiskPresentation {
  if (level === "high") {
    return { label: "High risk", tone: "danger" };
  }
  if (level === "medium") {
    return { label: "Medium risk", tone: "warning" };
  }
  return { label: "Low risk", tone: "success" };
}

function toApprovalDetail(approval: ApprovalDto): ApprovalDetailViewModel {
  return {
    ...approval,
    risk: {
      ...approval.risk,
      ...getApprovalRiskPresentation(approval.risk.level)
    },
    inputJson: JSON.stringify(approval.input, null, 2),
    approveAction: createButton({ label: "Approve", variant: "primary" }),
    denyAction: createButton({ label: "Deny", variant: "danger" }),
    suggestions: approval.suggestions.map((suggestion) => ({
      ...suggestion,
      applyAction: createButton({
        label: "Apply rule",
        variant: suggestion.status === "applied" ? "secondary" : "primary",
        disabled: suggestion.status === "applied"
      })
    }))
  };
}
