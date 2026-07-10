import test from "node:test";
import assert from "node:assert/strict";

import { createTaskRequestFromFormData } from "../../apps/web/src/features/tasks/task-create-form.js";

test("task create form data maps to create task api request", () => {
  const formData = new FormData();
  formData.set("goal", "  完成 F2 任务中心  ");
  formData.set("projectId", "project-harness");
  formData.set("userId", "user-demo");

  assert.deepEqual(createTaskRequestFromFormData(formData), {
    goal: "完成 F2 任务中心",
    projectId: "project-harness",
    userId: "user-demo"
  });
});

test("task create form data rejects empty goal", () => {
  const formData = new FormData();
  formData.set("goal", " ");
  formData.set("projectId", "project-harness");
  formData.set("userId", "user-demo");

  assert.throws(
    () => createTaskRequestFromFormData(formData),
    /goal is required/
  );
});
