import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_PAGES,
  createAppShellViewModel
} from "../../apps/web/src/app/shell.js";

test("app shell registers six core pages with shared navigation", () => {
  assert.deepEqual(APP_PAGES.map((page: { id: string }) => page.id), [
    "tasks",
    "approvals",
    "release-readiness",
    "metrics",
    "policy",
    "plugins"
  ]);

  const shell = createAppShellViewModel("/metrics");
  assert.equal(shell.navigation.length, 6);
  assert.equal(shell.navigation[3].active, true);
  assert.equal(shell.navigation[3].ariaCurrent, "page");
  assert.equal(shell.navigation[0].ariaCurrent, undefined);
});

test("app shell exposes topbar context for each page", () => {
  const shell = createAppShellViewModel("/settings/plugins");

  assert.equal(shell.brand, "Harness Console");
  assert.equal(shell.currentPage.id, "plugins");
  assert.equal(shell.topbar.title, "插件中心");
  assert.equal(shell.topbar.description, "管理团队共享工具、Skill 和外部集成能力。");
  assert.equal(shell.mainRegionAriaLabel, "插件中心内容区");
});
