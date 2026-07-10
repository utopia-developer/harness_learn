export const DESIGN_TOKENS = {
  color: {
    surface: {
      canvas: "#f4f7f5",
      panel: "#ffffff",
      inverse: "#10231f"
    },
    text: {
      primary: "#182026",
      secondary: "#5b6c65",
      inverse: "#eef5ef"
    },
    border: {
      default: "#d7dfda",
      strong: "#9fb2aa"
    },
    status: {
      pending: "#6b7280",
      planning: "#6f59cf",
      running: "#2f6fed",
      waitingApproval: "#b56b00",
      completed: "#247b4b",
      failed: "#c93c37",
      cancelled: "#64748b"
    }
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px"
  },
  radius: {
    control: "6px",
    card: "8px",
    pill: "999px"
  },
  font: {
    family:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    size: {
      xs: "12px",
      sm: "13px",
      md: "14px",
      lg: "18px",
      xl: "28px"
    }
  },
  focus: {
    ringColor: "#2f6fed",
    ringWidth: "2px",
    ringOffset: "2px"
  }
} as const;

export type StatusTone = keyof typeof DESIGN_TOKENS.color.status;
export type ComponentTone =
  | StatusTone
  | "neutral"
  | "success"
  | "warning"
  | "danger";
