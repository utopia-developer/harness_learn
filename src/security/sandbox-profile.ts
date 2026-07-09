import { relative, resolve } from "node:path";

export type NetworkPolicy =
  | { mode: "deny_all" }
  | { mode: "allowlist"; allowedHosts: string[] };

export type SandboxProfile = {
  workspaceRoot: string;
  allowedPaths: string[];
  commandTimeoutMs: number;
  network: NetworkPolicy;
};

export type CreateSandboxProfileInput = {
  workspaceRoot: string;
  allowedPaths?: string[];
  commandTimeoutMs?: number;
  network?: NetworkPolicy;
};

export type ValidateCommandSandboxInput = {
  profile: SandboxProfile;
  command: string;
  args: string[];
  cwd: string;
};

export type ValidatedCommandSandbox = {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
};

export function createSandboxProfile(input: CreateSandboxProfileInput): SandboxProfile {
  const workspaceRoot = resolve(input.workspaceRoot);
  return {
    workspaceRoot,
    allowedPaths: [workspaceRoot, ...(input.allowedPaths ?? []).map((path) => resolve(path))],
    commandTimeoutMs: input.commandTimeoutMs ?? 30_000,
    network: input.network ?? { mode: "deny_all" }
  };
}

export function validateCommandSandbox(
  input: ValidateCommandSandboxInput
): ValidatedCommandSandbox {
  const cwd = resolveInsideAllowedPaths(input.profile, input.cwd, { allowRoot: true });

  for (const arg of input.args) {
    validatePathArgument(input.profile, arg);
    validateNetworkArgument(input.profile, arg);
  }

  return {
    command: input.command,
    args: input.args,
    cwd,
    timeoutMs: input.profile.commandTimeoutMs
  };
}

function validatePathArgument(profile: SandboxProfile, arg: string): void {
  if (!arg.startsWith("/")) {
    return;
  }

  const absolutePath = resolve(arg);
  if (!isInsideAnyAllowedPath(profile, absolutePath)) {
    throw new Error(`Path escapes workspace and is outside sandbox: ${arg}`);
  }
}

function validateNetworkArgument(profile: SandboxProfile, arg: string): void {
  const host = extractUrlHost(arg);
  if (!host) {
    return;
  }

  if (profile.network.mode === "deny_all") {
    throw new Error(`Network access is denied by sandbox: ${host}`);
  }

  if (!profile.network.allowedHosts.includes(host)) {
    throw new Error(`Network host not allowed by sandbox: ${host}`);
  }
}

function extractUrlHost(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.hostname;
  } catch {
    return undefined;
  }
}

function resolveInsideAllowedPaths(
  profile: SandboxProfile,
  path: string,
  options: { allowRoot?: boolean } = {}
): string {
  const absolutePath = resolve(profile.workspaceRoot, path);
  const relativePath = relative(profile.workspaceRoot, absolutePath);
  if (!options.allowRoot && relativePath === "") {
    throw new Error(`Path is outside sandbox: ${path}`);
  }
  if (!isInsideAnyAllowedPath(profile, absolutePath)) {
    throw new Error(`Path escapes workspace and is outside sandbox: ${path}`);
  }
  return absolutePath;
}

function isInsideAnyAllowedPath(profile: SandboxProfile, absolutePath: string): boolean {
  return profile.allowedPaths.some((allowedPath) => {
    const relativePath = relative(allowedPath, absolutePath);
    return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.startsWith("/"));
  });
}
