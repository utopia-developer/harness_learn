export type PermissionMode = "read_only" | "default" | "accept_edits" | "auto";

export type PermissionDecisionType = "allow" | "ask" | "deny";

export type PermissionDecision = {
  decision: PermissionDecisionType;
  reason: string;
};
