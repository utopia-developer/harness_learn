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
      ? { policyReadonlyMessage: "需要管理员权限才能修改项目策略。" }
      : {}),
    ...(!session.permissions.canManagePlugins
      ? { pluginReadonlyMessage: "需要管理员权限才能管理团队插件。" }
      : {})
  };
}

function roleLabel(role: UserRole): string {
  if (role === "admin") {
    return "管理员";
  }
  if (role === "developer") {
    return "开发者";
  }
  return "观察者";
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
