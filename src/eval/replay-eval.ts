import type { AgentTrace } from "../trace/trace-collector.js";

export type ReplayCase = {
  id: string;
  traceId: string;
  taskId: string;
  userMessage: string;
  expectedOutput: string;
  expectedTools: string[];
};

export type ReplayRunResult = {
  output: string;
  tools: string[];
};

export type ReplayRunner = (replayCase: ReplayCase) => Promise<ReplayRunResult> | ReplayRunResult;

export type EvalCaseResult = {
  caseId: string;
  passed: boolean;
  failures: string[];
};

export type EvalGateResult = {
  passed: boolean;
  results: EvalCaseResult[];
};

export function createReplayCaseFromTrace(input: {
  trace: AgentTrace;
  userMessage: string;
}): ReplayCase {
  const completed = [...input.trace.events]
    .reverse()
    .find((event) => event.type === "agent.completed");
  const expectedTools = input.trace.events
    .filter((event) => event.type === "tool.requested")
    .map((event) => event.tool);

  return {
    id: `replay-${input.trace.traceId}`,
    traceId: input.trace.traceId,
    taskId: input.trace.taskId,
    userMessage: input.userMessage,
    expectedOutput: completed?.type === "agent.completed" ? completed.output : "",
    expectedTools
  };
}

export async function runEvalGate(input: {
  cases: ReplayCase[];
  runner: ReplayRunner;
}): Promise<EvalGateResult> {
  const results: EvalCaseResult[] = [];

  for (const replayCase of input.cases) {
    const actual = await input.runner(replayCase);
    const failures: string[] = [];
    if (actual.output !== replayCase.expectedOutput) {
      failures.push("Output changed");
    }
    if (!sameSequence(actual.tools, replayCase.expectedTools)) {
      failures.push("Tool sequence changed");
    }
    results.push({
      caseId: replayCase.id,
      passed: failures.length === 0,
      failures
    });
  }

  return {
    passed: results.every((result) => result.passed),
    results
  };
}

function sameSequence(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
