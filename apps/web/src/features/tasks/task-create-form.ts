import type { CreateTaskRequest } from "../../../../../packages/contracts/src/index.js";

export function createTaskRequestFromFormData(formData: FormData): CreateTaskRequest {
  const goal = readRequiredString(formData, "goal").trim();
  const projectId = readRequiredString(formData, "projectId").trim();
  const userId = readRequiredString(formData, "userId").trim();

  if (!goal) {
    throw new Error("goal is required");
  }

  return {
    goal,
    projectId,
    userId
  };
}

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") {
    throw new Error(`${key} is required`);
  }
  return value;
}
