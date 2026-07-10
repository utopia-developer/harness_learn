import test from "node:test";
import assert from "node:assert/strict";

import { createSessionViewModel } from "../../apps/web/src/features/security/session-view-model.js";

test("session view model exposes role label and permission affordances", () => {
  const viewModel = createSessionViewModel({
    user: {
      id: "user-viewer",
      name: "Harness Viewer",
      role: "viewer"
    },
    permissions: {
      canEditPolicy: false,
      canApproveDangerous: false,
      canManagePlugins: false
    }
  });

  assert.equal(viewModel.userLabel, "Harness Viewer");
  assert.deepEqual(viewModel.roleBadge, {
    kind: "badge",
    label: "Viewer",
    tone: "neutral"
  });
  assert.equal(viewModel.canEditPolicy, false);
  assert.equal(viewModel.policyReadonlyMessage, "Admin role required to modify project policy.");
});
