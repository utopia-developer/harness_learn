export type PermissionMode = "read_only" | "default" | "accept_edits" | "auto";

export type PermissionDecisionType = "allow" | "ask" | "deny";

export type PermissionDecision = {
  decision: PermissionDecisionType;
  reason: string;
};

export type PermissionApprovalRequest = {
  taskId: string;
  runId: string;
  callId: string;
  tool: string;
  input: unknown;
  reason: string;
};

export type PermissionApprovalResult = {
  approved: boolean;
  reason: string;
};

export type ApprovalHandler = (
  request: PermissionApprovalRequest
) => Promise<PermissionApprovalResult> | PermissionApprovalResult;

export type ApprovalRecord = {
  taskId: string;
  runId: string;
  callId: string;
  tool: string;
  decision: "allow" | "deny";
  reason: string;
};

export type ApprovalStore = {
  record(record: ApprovalRecord): Promise<void> | void;
};
