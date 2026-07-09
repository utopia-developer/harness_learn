import test from "node:test";
import assert from "node:assert/strict";

import {
  compactContext,
  estimateTokens,
  type ContextItem
} from "../../src/context/context-manager.js";

test("estimateTokens provides a deterministic lightweight token estimate", () => {
  assert.equal(estimateTokens("hello"), 2);
  assert.equal(estimateTokens("hello harness"), 3);
  assert.equal(estimateTokens("你好，harness"), 3);
});

test("compactContext preserves goal and constraints when history exceeds budget", () => {
  const items: ContextItem[] = [
    {
      id: "goal",
      kind: "user_goal",
      content: "用户目标：实现阶段 3 的上下文能力",
      priority: 100,
      tokenEstimate: 10
    },
    {
      id: "constraint",
      kind: "system_constraint",
      content: "必须使用 TDD 并提交到 GitHub",
      priority: 90,
      tokenEstimate: 10
    },
    {
      id: "state",
      kind: "task_state",
      content: "阶段 2 已完成",
      priority: 80,
      tokenEstimate: 8
    },
    {
      id: "history-1",
      kind: "compressible_history",
      content: "历史内容一 ".repeat(20),
      priority: 20,
      tokenEstimate: 60
    },
    {
      id: "history-2",
      kind: "compressible_history",
      content: "历史内容二 ".repeat(20),
      priority: 20,
      tokenEstimate: 60
    },
    {
      id: "redundant",
      kind: "discardable",
      content: "可丢弃冗余内容",
      priority: 0,
      tokenEstimate: 5
    }
  ];

  const result = compactContext({ items, maxTokens: 45 });

  assert.deepEqual(
    result.items.map((item) => item.id),
    ["goal", "constraint", "state", "summary"]
  );
  assert.equal(result.droppedItemIds.includes("redundant"), true);
  assert.match(result.items.at(-1)?.content ?? "", /Compressed history/);
  assert.ok(result.totalTokens <= 45);
});
