export type WorkerTask<T> = () => Promise<T> | T;

export type WorkerPool = {
  enqueue<T>(task: WorkerTask<T>): Promise<T>;
};

export function createWorkerPool(input: { concurrency: number }): WorkerPool {
  if (input.concurrency < 1) {
    throw new Error("Worker pool concurrency must be at least 1");
  }

  let running = 0;
  const queue: Array<() => void> = [];

  const schedule = (): void => {
    if (running >= input.concurrency) {
      return;
    }
    const next = queue.shift();
    next?.();
  };

  return {
    enqueue(task) {
      return new Promise((resolve, reject) => {
        const run = async (): Promise<void> => {
          running += 1;
          try {
            resolve(await task());
          } catch (error) {
            reject(error);
          } finally {
            running -= 1;
            schedule();
          }
        };

        queue.push(run);
        schedule();
      });
    }
  };
}

export type SandboxInstance = {
  id: string;
  provider: "local" | "cloud";
};

export type SandboxLease = SandboxInstance & {
  taskId: string;
};

export type SandboxPool = {
  acquire(taskId: string): SandboxLease;
  release(sandboxId: string): void;
  availableCount(): number;
};

export function createSandboxPool(instances: SandboxInstance[]): SandboxPool {
  const available = instances.map((instance) => ({ ...instance }));
  const leased = new Map<string, SandboxLease>();

  return {
    acquire(taskId) {
      const instance = available.shift();
      if (!instance) {
        throw new Error("No sandbox available");
      }
      const lease = { ...instance, taskId };
      leased.set(lease.id, lease);
      return { ...lease };
    },
    release(sandboxId) {
      const lease = leased.get(sandboxId);
      if (!lease) {
        throw new Error(`Sandbox lease not found: ${sandboxId}`);
      }
      leased.delete(sandboxId);
      available.push({ id: lease.id, provider: lease.provider });
    },
    availableCount() {
      return available.length;
    }
  };
}

export type AuditEvent = {
  timestamp: string;
  actorId: string;
  action: string;
  target: string;
  projectId?: string;
};

export type AuditLog = {
  record(event: AuditEvent): void;
  list(): AuditEvent[];
  exportJsonl(): string;
};

export function createAuditLog(): AuditLog {
  const events: AuditEvent[] = [];

  return {
    record(event) {
      events.push({ ...event });
    },
    list() {
      return events.map((event) => ({ ...event }));
    },
    exportJsonl() {
      return events.map((event) => JSON.stringify(event)).join("\n");
    }
  };
}
