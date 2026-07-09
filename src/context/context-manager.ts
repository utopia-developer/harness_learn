export type ContextItemKind =
  | "user_goal"
  | "system_constraint"
  | "task_state"
  | "tool_fact"
  | "compressible_history"
  | "discardable"
  | "summary";

export type ContextItem = {
  id: string;
  kind: ContextItemKind;
  content: string;
  priority: number;
  tokenEstimate?: number;
};

export type CompactContextInput = {
  items: ContextItem[];
  maxTokens: number;
};

export type CompactContextResult = {
  items: ContextItem[];
  totalTokens: number;
  droppedItemIds: string[];
};

const PROTECTED_KINDS = new Set<ContextItemKind>([
  "user_goal",
  "system_constraint",
  "task_state",
  "tool_fact"
]);

export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  const asciiWords = text.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const nonAsciiChars = [...text].filter((char) => char.charCodeAt(0) > 127).length;
  const punctuation = text.match(/[^\sA-Za-z0-9_\u0080-\uFFFF]/g)?.length ?? 0;
  if (asciiWords > 0 && nonAsciiChars === 0 && punctuation === 0) {
    return asciiWords + 1;
  }
  return Math.max(1, Math.ceil(asciiWords + nonAsciiChars / 2 + punctuation));
}

export function compactContext(input: CompactContextInput): CompactContextResult {
  const normalized = input.items.map((item) => ({
    ...item,
    tokenEstimate: item.tokenEstimate ?? estimateTokens(item.content)
  }));
  const selected: ContextItem[] = [];
  const droppedItemIds: string[] = [];
  let totalTokens = 0;

  for (const item of normalized.filter((candidate) => PROTECTED_KINDS.has(candidate.kind))) {
    selected.push(item);
    totalTokens += item.tokenEstimate ?? 0;
  }

  const remainingBudget = Math.max(0, input.maxTokens - totalTokens);
  const compressible = normalized.filter((item) => item.kind === "compressible_history");
  const discardable = normalized.filter((item) => item.kind === "discardable");
  droppedItemIds.push(...discardable.map((item) => item.id));

  if (compressible.length > 0 && remainingBudget > 0) {
    const summary = createSummary(compressible, remainingBudget);
    selected.push(summary);
    totalTokens += summary.tokenEstimate ?? 0;
  } else {
    droppedItemIds.push(...compressible.map((item) => item.id));
  }

  const selectedIds = new Set(selected.map((item) => item.id));
  for (const item of normalized) {
    if (!selectedIds.has(item.id) && !droppedItemIds.includes(item.id)) {
      droppedItemIds.push(item.id);
    }
  }

  return {
    items: selected.sort((left, right) => right.priority - left.priority),
    totalTokens,
    droppedItemIds
  };
}

function createSummary(items: ContextItem[], maxTokens: number): ContextItem {
  const sourceIds = items.map((item) => item.id).join(", ");
  const preview = items
    .map((item) => item.content.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
  const tokenEstimate = Math.min(maxTokens, Math.max(1, Math.ceil(maxTokens / 2)));
  const maxChars = Math.max(40, tokenEstimate * 4);
  const clipped = preview.length > maxChars ? `${preview.slice(0, maxChars - 3)}...` : preview;

  return {
    id: "summary",
    kind: "summary",
    content: `Compressed history from ${sourceIds}: ${clipped}`,
    priority: 10,
    tokenEstimate
  };
}
