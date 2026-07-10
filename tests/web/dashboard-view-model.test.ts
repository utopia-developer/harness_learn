import test from "node:test";
import assert from "node:assert/strict";

import { createDemoConsoleDashboard } from "../../apps/api/src/dashboard-fixture.js";
import { createDashboardViewModel } from "../../apps/web/src/features/console/dashboard-view-model.js";

test("dashboard view model exposes operational summary for the shell", () => {
  const dashboard = createDemoConsoleDashboard();
  const viewModel = createDashboardViewModel(dashboard);

  assert.equal(viewModel.totalTasks, 1);
  assert.equal(viewModel.pendingApprovalCount, 1);
  assert.equal(viewModel.runningTraceCount, 1);
  assert.equal(viewModel.primaryTask?.goal, "验证前端 F0 Console Dashboard 闭环");
});
