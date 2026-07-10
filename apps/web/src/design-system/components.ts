import type { ComponentTone } from "./tokens.js";

export type ButtonViewModel = {
  kind: "button";
  label: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
  disabled: boolean;
  ariaLabel: string;
  tabIndex: 0 | -1;
};

export type BadgeViewModel = {
  kind: "badge";
  label: string;
  tone: ComponentTone;
};

export type CardViewModel = {
  kind: "card";
  title: string;
  description?: string;
};

export type TableColumn = {
  key: string;
  label: string;
  scope: "col";
};

export type TableRow = {
  id: string;
  cells: Record<string, string>;
};

export type TableViewModel = {
  kind: "table";
  caption: string;
  columns: TableColumn[];
  rows: TableRow[];
};

export type MetricCardViewModel = {
  kind: "metric-card";
  label: string;
  value: string;
  trend?: string;
};

export type ProgressBarViewModel = {
  kind: "progress-bar";
  label: string;
  value: number;
  ariaValueText: string;
};

export type CodeBlockViewModel = {
  kind: "code-block";
  code: string;
  language: string;
};

export type PermissionRiskLevel = "low" | "medium" | "high";

export type PermissionRiskBadgeViewModel = {
  kind: "permission-risk-badge";
  level: PermissionRiskLevel;
  label: string;
  tone: "success" | "warning" | "danger";
};

export type EmptyStateViewModel = {
  kind: "empty";
  title: string;
  description: string;
};

export type LoadingStateViewModel = {
  kind: "loading";
  label: string;
  ariaLive: "polite";
};

export type ErrorStateViewModel = {
  kind: "error";
  title: string;
  message: string;
  retry?: ButtonViewModel;
};

export function createButton(input: {
  label: string;
  variant?: ButtonViewModel["variant"];
  disabled?: boolean;
  ariaLabel?: string;
}): ButtonViewModel {
  const disabled = input.disabled ?? false;
  return {
    kind: "button",
    label: input.label,
    variant: input.variant ?? "secondary",
    disabled,
    ariaLabel: input.ariaLabel ?? input.label,
    tabIndex: disabled ? -1 : 0
  };
}

export function createBadge(input: {
  label: string;
  tone?: ComponentTone;
}): BadgeViewModel {
  return {
    kind: "badge",
    label: input.label,
    tone: input.tone ?? "neutral"
  };
}

export function createCard(input: {
  title: string;
  description?: string;
}): CardViewModel {
  return {
    kind: "card",
    title: input.title,
    ...(input.description ? { description: input.description } : {})
  };
}

export function createTable(input: {
  caption: string;
  columns: Array<Omit<TableColumn, "scope">>;
  rows: TableRow[];
}): TableViewModel {
  return {
    kind: "table",
    caption: input.caption,
    columns: input.columns.map((column) => ({
      ...column,
      scope: "col"
    })),
    rows: input.rows
  };
}

export function createMetricCard(input: {
  label: string;
  value: string | number;
  trend?: string;
}): MetricCardViewModel {
  return {
    kind: "metric-card",
    label: input.label,
    value: String(input.value),
    ...(input.trend ? { trend: input.trend } : {})
  };
}

export function createProgressBar(input: {
  label: string;
  value: number;
}): ProgressBarViewModel {
  const value = Math.max(0, Math.min(100, Math.round(input.value)));
  return {
    kind: "progress-bar",
    label: input.label,
    value,
    ariaValueText: `${input.label} ${value}%`
  };
}

export function createCodeBlock(input: {
  code: string;
  language?: string;
}): CodeBlockViewModel {
  return {
    kind: "code-block",
    code: input.code,
    language: input.language ?? "text"
  };
}

export function createPermissionRiskBadge(
  level: PermissionRiskLevel
): PermissionRiskBadgeViewModel {
  if (level === "high") {
    return {
      kind: "permission-risk-badge",
      level,
      label: "高风险",
      tone: "danger"
    };
  }
  if (level === "medium") {
    return {
      kind: "permission-risk-badge",
      level,
      label: "中风险",
      tone: "warning"
    };
  }
  return {
    kind: "permission-risk-badge",
    level,
    label: "低风险",
    tone: "success"
  };
}

export function createEmptyState(input: {
  title: string;
  description: string;
}): EmptyStateViewModel {
  return {
    kind: "empty",
    title: input.title,
    description: input.description
  };
}

export function createLoadingState(label = "正在加载"): LoadingStateViewModel {
  return {
    kind: "loading",
    label,
    ariaLive: "polite"
  };
}

export function createErrorState(input: {
  title: string;
  message: string;
  retryLabel?: string;
}): ErrorStateViewModel {
  return {
    kind: "error",
    title: input.title,
    message: input.message,
    ...(input.retryLabel ? { retry: createButton({ label: input.retryLabel }) } : {})
  };
}
