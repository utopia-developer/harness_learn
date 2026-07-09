import type { ApprovalRecord, ApprovalStore } from "./types.js";

export type MemoryApprovalStore = ApprovalStore & {
  list(): ApprovalRecord[];
};

export function createMemoryApprovalStore(): MemoryApprovalStore {
  const records: ApprovalRecord[] = [];

  return {
    record(record) {
      records.push({ ...record });
    },
    list() {
      return records.map((record) => ({ ...record }));
    }
  };
}
