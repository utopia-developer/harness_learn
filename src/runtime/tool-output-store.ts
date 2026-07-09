export type ToolOutputRecord = {
  ref: string;
  taskId: string;
  runId: string;
  callId: string;
  tool: string;
  content: string;
  bytes: number;
};

export type StoreToolOutputInput = Omit<ToolOutputRecord, "ref">;

export type ToolOutputStore = {
  put(input: StoreToolOutputInput): Promise<ToolOutputRecord> | ToolOutputRecord;
  get(ref: string): Promise<ToolOutputRecord | undefined> | ToolOutputRecord | undefined;
};

export type MemoryToolOutputStore = ToolOutputStore & {
  get(ref: string): ToolOutputRecord | undefined;
  list(): ToolOutputRecord[];
};

export function createMemoryToolOutputStore(): MemoryToolOutputStore {
  const records = new Map<string, ToolOutputRecord>();

  return {
    put(input) {
      const record = {
        ...input,
        ref: `tool-output://${input.runId}/${input.callId}`
      };
      records.set(record.ref, record);
      return { ...record };
    },
    get(ref) {
      const record = records.get(ref);
      return record ? { ...record } : undefined;
    },
    list() {
      return [...records.values()].map((record) => ({ ...record }));
    }
  };
}
