import test from "node:test";
import assert from "node:assert/strict";

import {
  DESIGN_TOKENS,
  createBadge,
  createButton,
  createCodeBlock,
  createMetricCard,
  createPermissionRiskBadge,
  createProgressBar,
  createTable
} from "../../apps/web/src/design-system/index.js";

test("design tokens expose semantic colors and accessible focus ring", () => {
  assert.equal(DESIGN_TOKENS.color.status.running, "#2f6fed");
  assert.equal(DESIGN_TOKENS.color.status.waitingApproval, "#b56b00");
  assert.equal(DESIGN_TOKENS.color.status.failed, "#c93c37");
  assert.equal(DESIGN_TOKENS.focus.ringColor, "#2f6fed");
  assert.equal(DESIGN_TOKENS.radius.card, "8px");
});

test("design system components expose keyboard and aria metadata", () => {
  assert.deepEqual(createButton({ label: "创建任务", variant: "primary" }), {
    kind: "button",
    label: "创建任务",
    variant: "primary",
    disabled: false,
    ariaLabel: "创建任务",
    tabIndex: 0
  });

  assert.equal(createBadge({ label: "运行中", tone: "running" }).tone, "running");
  assert.equal(createMetricCard({ label: "待审批", value: 2 }).value, "2");
  assert.equal(createProgressBar({ label: "发布就绪", value: 140 }).value, 100);
  assert.equal(createCodeBlock({ code: "npm test", language: "shell" }).language, "shell");
});

test("table and permission risk badges provide structured state", () => {
  const table = createTable({
    caption: "任务列表",
    columns: [
      { key: "goal", label: "目标" },
      { key: "status", label: "状态" }
    ],
    rows: [
      { id: "task-1", cells: { goal: "验证 F1", status: "running" } }
    ]
  });

  assert.equal(table.caption, "任务列表");
  assert.equal(table.columns[0].scope, "col");
  assert.equal(table.rows[0].cells.status, "running");
  assert.deepEqual(createPermissionRiskBadge("high"), {
    kind: "permission-risk-badge",
    level: "high",
    label: "高风险",
    tone: "danger"
  });
});
