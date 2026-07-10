import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { AgentEvent, Clock } from "../core/events.js";

export type TaskStatus =
  | "pending"
  | "planning"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskRecord = {
  id: string;
  projectId: string;
  userId: string;
  goal: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  id: string;
  projectId: string;
  userId: string;
  goal: string;
};

export type TaskCheckpoint = {
  id: string;
  taskId: string;
  runId: string;
  state: unknown;
  createdAt: string;
};

export type SaveCheckpointInput = Omit<TaskCheckpoint, "createdAt">;

export type TaskService = {
  createTask(input: CreateTaskInput): Promise<TaskRecord>;
  getTask(taskId: string): Promise<TaskRecord | undefined>;
  listTasks(): Promise<TaskRecord[]>;
  appendRunEvent(event: AgentEvent): Promise<void>;
  listRunEvents(taskId: string, runId: string): Promise<AgentEvent[]>;
  saveCheckpoint(input: SaveCheckpointInput): Promise<TaskCheckpoint>;
  getLatestCheckpoint(taskId: string): Promise<TaskCheckpoint | undefined>;
};

export type FileTaskServiceInput = {
  rootDir: string;
  now?: Clock;
};

type StoredTaskState = {
  tasks: TaskRecord[];
  events: AgentEvent[];
  checkpoints: TaskCheckpoint[];
};

export function createFileTaskService(input: FileTaskServiceInput): TaskService {
  const now = input.now ?? (() => new Date());
  const storePath = join(input.rootDir, "tasks-store.json");

  return {
    async createTask(taskInput) {
      const state = await loadState(input.rootDir, storePath);
      if (state.tasks.some((task) => task.id === taskInput.id)) {
        throw new Error(`Task already exists: ${taskInput.id}`);
      }

      const timestamp = now().toISOString();
      const task: TaskRecord = {
        ...taskInput,
        status: "pending",
        createdAt: timestamp,
        updatedAt: timestamp
      };
      state.tasks.push(task);
      await saveState(input.rootDir, storePath, state);
      return { ...task };
    },
    async getTask(taskId) {
      const state = await loadState(input.rootDir, storePath);
      const task = state.tasks.find((item) => item.id === taskId);
      return task ? { ...task } : undefined;
    },
    async listTasks() {
      const state = await loadState(input.rootDir, storePath);
      return state.tasks.map((task) => ({ ...task }));
    },
    async appendRunEvent(event) {
      const state = await loadState(input.rootDir, storePath);
      const task = state.tasks.find((item) => item.id === event.taskId);
      if (!task) {
        throw new Error(`Task not found: ${event.taskId}`);
      }

      state.events.push({ ...event });
      task.status = statusFromEvent(event) ?? task.status;
      task.updatedAt = event.timestamp;
      await saveState(input.rootDir, storePath, state);
    },
    async listRunEvents(taskId, runId) {
      const state = await loadState(input.rootDir, storePath);
      return state.events
        .filter((event) => event.taskId === taskId && event.runId === runId)
        .map((event) => ({ ...event }));
    },
    async saveCheckpoint(checkpointInput) {
      const state = await loadState(input.rootDir, storePath);
      if (!state.tasks.some((task) => task.id === checkpointInput.taskId)) {
        throw new Error(`Task not found: ${checkpointInput.taskId}`);
      }

      const checkpoint = {
        ...checkpointInput,
        createdAt: now().toISOString()
      };
      state.checkpoints.push(checkpoint);
      await saveState(input.rootDir, storePath, state);
      return cloneCheckpoint(checkpoint);
    },
    async getLatestCheckpoint(taskId) {
      const state = await loadState(input.rootDir, storePath);
      const checkpoint = [...state.checkpoints]
        .reverse()
        .find((item) => item.taskId === taskId);
      return checkpoint ? cloneCheckpoint(checkpoint) : undefined;
    }
  };
}

async function loadState(rootDir: string, storePath: string): Promise<StoredTaskState> {
  await mkdir(rootDir, { recursive: true });
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as StoredTaskState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { tasks: [], events: [], checkpoints: [] };
    }
    throw error;
  }
}

async function saveState(
  rootDir: string,
  storePath: string,
  state: StoredTaskState
): Promise<void> {
  await mkdir(rootDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(state, null, 2), "utf8");
}

function statusFromEvent(event: AgentEvent): TaskStatus | undefined {
  if (event.type === "agent.started") {
    return "running";
  }
  if (event.type === "permission.requested") {
    return "waiting_approval";
  }
  if (event.type === "agent.completed") {
    return "completed";
  }
  if (event.type === "agent.failed") {
    return "failed";
  }
  if (event.type === "agent.cancelled") {
    return "cancelled";
  }
  return undefined;
}

function cloneCheckpoint(checkpoint: TaskCheckpoint): TaskCheckpoint {
  return {
    ...checkpoint,
    state: cloneJson(checkpoint.state)
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
