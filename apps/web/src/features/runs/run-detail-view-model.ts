import {
  API_ENDPOINTS,
  type RunTraceEventDto,
  type RunTraceResponse,
  type RunTraceStatus
} from "../../../../../packages/contracts/src/index.js";
import { createBadge, type BadgeViewModel, type ComponentTone } from "../../design-system/index.js";

export type RunTimelineItemViewModel = {
  id: string;
  sequence: number;
  kind: "agent" | "llm" | "tool" | "permission";
  title: string;
  summary: string;
  timestamp: string;
  severity: RunTraceEventDto["severity"];
  badge: BadgeViewModel;
  selected: boolean;
  hasOutputRef: boolean;
};

export type RunEventDetailViewModel = RunTraceEventDto & {
  inputJson?: string;
  outputRefHref?: string;
};

export type RunDetailViewModel = {
  header: {
    taskId: string;
    runId: string;
    traceId: string;
    status: BadgeViewModel;
    eventCount: number;
  };
  timeline: RunTimelineItemViewModel[];
  selectedEvent: RunEventDetailViewModel | undefined;
  failure?: RunTraceResponse["failure"];
  replayCaseHref: string;
};

export function createRunDetailViewModel(
  trace: RunTraceResponse,
  selectedEventId = trace.events[0]?.id
): RunDetailViewModel {
  const selectedEvent = trace.events.find((event) => event.id === selectedEventId);
  return {
    header: {
      taskId: trace.taskId,
      runId: trace.runId,
      traceId: trace.traceId,
      status: createBadge(statusPresentation(trace.status)),
      eventCount: trace.events.length
    },
    timeline: trace.events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      kind: eventKind(event.type),
      title: event.title,
      summary: event.summary,
      timestamp: event.timestamp,
      severity: event.severity,
      badge: createBadge({ label: event.type, tone: severityTone(event.severity) }),
      selected: event.id === selectedEventId,
      hasOutputRef: Boolean(event.outputRef)
    })),
    selectedEvent: selectedEvent ? toEventDetail(selectedEvent) : undefined,
    failure: trace.failure,
    replayCaseHref: API_ENDPOINTS.replayCase(trace.traceId)
  };
}

export function parseRunStreamSnapshot(stream: string): RunTraceEventDto[] {
  const events: RunTraceEventDto[] = [];
  for (const block of stream.split("\n\n")) {
    const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
    if (!dataLine) {
      continue;
    }
    events.push(JSON.parse(dataLine.slice("data: ".length)) as RunTraceEventDto);
  }
  return events;
}

function toEventDetail(event: RunTraceEventDto): RunEventDetailViewModel {
  return {
    ...event,
    ...(event.input !== undefined ? { inputJson: JSON.stringify(event.input, null, 2) } : {}),
    ...(event.outputRef ? { outputRefHref: API_ENDPOINTS.toolOutput(event.outputRef) } : {})
  };
}

function statusPresentation(status: RunTraceStatus): {
  label: string;
  tone: ComponentTone;
} {
  if (status === "completed") {
    return { label: "Completed", tone: "completed" };
  }
  if (status === "failed") {
    return { label: "Failed", tone: "failed" };
  }
  if (status === "cancelled") {
    return { label: "Cancelled", tone: "cancelled" };
  }
  return { label: "Running", tone: "running" };
}

function severityTone(severity: RunTraceEventDto["severity"]): ComponentTone {
  if (severity === "success") {
    return "success";
  }
  if (severity === "warning") {
    return "warning";
  }
  if (severity === "error") {
    return "danger";
  }
  return "neutral";
}

function eventKind(type: RunTraceEventDto["type"]): RunTimelineItemViewModel["kind"] {
  if (type.startsWith("llm.")) {
    return "llm";
  }
  if (type.startsWith("tool.")) {
    return "tool";
  }
  if (type.startsWith("permission.")) {
    return "permission";
  }
  return "agent";
}
