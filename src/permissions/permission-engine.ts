import type { ToolContract } from "../tools/types.js";
import type { PermissionDecision, PermissionMode } from "./types.js";

export type DecideToolPermissionInput = {
  mode: PermissionMode;
  tool: ToolContract;
};

export function decideToolPermission(input: DecideToolPermissionInput): PermissionDecision {
  if (input.tool.permission === "deny") {
    return {
      decision: "deny",
      reason: `Tool ${input.tool.name} is denied by tool policy`
    };
  }

  if (input.mode === "read_only") {
    return input.tool.readOnly
      ? { decision: "allow", reason: `Tool ${input.tool.name} is read-only` }
      : { decision: "deny", reason: `Tool ${input.tool.name} is blocked in read-only mode` };
  }

  if (input.mode === "auto") {
    return {
      decision: "allow",
      reason: `Auto mode allows ${input.tool.name}`
    };
  }

  if (input.mode === "accept_edits" && input.tool.name === "write_file") {
    return {
      decision: "allow",
      reason: "accept_edits mode allows file edits"
    };
  }

  if (input.tool.permission === "ask") {
    return {
      decision: "ask",
      reason: `Tool ${input.tool.name} requires approval`
    };
  }

  return {
    decision: "allow",
    reason: `Tool ${input.tool.name} is allowed`
  };
}
