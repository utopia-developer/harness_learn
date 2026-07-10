import { createBadge, type BadgeViewModel } from "../../design-system/index.js";
import type { SessionResponse, UserRole } from "../../../../../packages/contracts/src/index.js";

export type SessionViewModel = {
  userLabel: string;
  roleBadge: BadgeViewModel;
  canEditPolicy: boolean;
  canApproveDangerous: boolean;
  canManagePlugins: boolean;
  policyReadonlyMessage?: string;
  pluginReadonlyMessage?: string;
};

export function createSessionViewModel(session: SessionResponse): SessionViewModel {
  return {
    userLabel: session.user.name,
    roleBadge: createBadge({
      label: roleLabel(session.user.role),
      tone: roleTone(session.user.role)
    }),
    canEditPolicy: session.permissions.canEditPolicy,
    canApproveDangerous: session.permissions.canApproveDangerous,
    canManagePlugins: session.permissions.canManagePlugins,
    ...(!session.permissions.canEditPolicy
      ? { policyReadonlyMessage: "Admin role required to modify project policy." }
      : {}),
    ...(!session.permissions.canManagePlugins
      ? { pluginReadonlyMessage: "Admin role required to manage team plugins." }
      : {})
  };
}

function roleLabel(role: UserRole): string {
  if (role === "admin") {
    return "Admin";
  }
  if (role === "developer") {
    return "Developer";
  }
  return "Viewer";
}

function roleTone(role: UserRole): "neutral" | "warning" | "success" {
  if (role === "admin") {
    return "success";
  }
  if (role === "developer") {
    return "warning";
  }
  return "neutral";
}
