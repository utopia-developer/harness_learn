export type MemoryKind = "task_summary";

export type MemoryRecord = {
  id: string;
  taskId: string;
  runId: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
};

export type AddMemoryInput = Omit<MemoryRecord, "id">;

export type MemoryStore = {
  add(input: AddMemoryInput): Promise<MemoryRecord> | MemoryRecord;
};

export type InMemoryMemoryStore = MemoryStore & {
  list(): MemoryRecord[];
};

export function createMemoryStore(): InMemoryMemoryStore {
  const records: MemoryRecord[] = [];

  return {
    add(input) {
      const record = {
        ...input,
        id: `memory-${records.length + 1}`
      };
      records.push(record);
      return { ...record };
    },
    list() {
      return records.map((record) => ({ ...record }));
    }
  };
}

export function createTaskSummaryMemory(input: {
  taskId: string;
  runId: string;
  userMessage: string;
  output: string;
  createdAt: string;
}): AddMemoryInput {
  return {
    taskId: input.taskId,
    runId: input.runId,
    kind: "task_summary",
    content: `User goal: ${input.userMessage}\nFinal output: ${input.output}`,
    createdAt: input.createdAt
  };
}
