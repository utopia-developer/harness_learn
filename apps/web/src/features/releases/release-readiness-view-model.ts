import { WEB_ROUTES } from "../../../../../packages/contracts/src/index.js";
import type {
  ListReleasesResponse,
  ReleaseGateCheckDto,
  ReleaseReadinessResponse,
  ReleaseReadinessStatus
} from "../../../../../packages/contracts/src/index.js";

export type Tone = "success" | "danger" | "warning";

export type ReleaseStatusPresentation = {
  label: string;
  tone: Tone;
};

export type ReleaseReadinessViewModel = {
  summary: {
    totalReleases: number;
    readyCount: number;
    blockedCount: number;
  };
  releases: Array<{
    id: string;
    title: string;
    version: string;
    generatedAt: string;
    href: string;
    selected: boolean;
    status: ReleaseStatusPresentation;
  }>;
  selected: {
    releaseId: string;
    title: string;
    version: string;
    projectId: string;
    generatedAt: string;
    status: ReleaseStatusPresentation;
    summary: string;
    checks: Array<{
      name: ReleaseGateCheckDto["name"];
      label: string;
      detail: string;
      status: {
        label: "通过" | "失败";
        tone: "success" | "danger";
      };
    }>;
    blockers: string[];
    evidence: {
      auditEventCountLabel: string;
      auditDownloadHref: string;
      traceIds: string[];
    };
    gateAction: {
      label: string;
      action: string;
    };
  };
};

export function createReleaseReadinessViewModel(input: {
  releases: ListReleasesResponse;
  readiness: ReleaseReadinessResponse;
}): ReleaseReadinessViewModel {
  const selectedReleaseId = input.readiness.release.id;

  return {
    summary: {
      totalReleases: input.releases.total,
      readyCount: input.releases.releases.filter((release) => release.status === "ready").length,
      blockedCount: input.releases.releases.filter((release) => release.status === "blocked").length
    },
    releases: input.releases.releases.map((release) => ({
      id: release.id,
      title: release.title,
      version: release.version,
      generatedAt: release.generatedAt,
      href: WEB_ROUTES.releaseReadiness(release.id),
      selected: release.id === selectedReleaseId,
      status: getReleaseStatusPresentation(release.status)
    })),
    selected: {
      releaseId: input.readiness.release.id,
      title: input.readiness.release.title,
      version: input.readiness.release.version,
      projectId: input.readiness.release.projectId,
      generatedAt: input.readiness.release.generatedAt,
      status: getReleaseStatusPresentation(input.readiness.release.status),
      summary: input.readiness.summary,
      checks: input.readiness.checks.map(toCheckViewModel),
      blockers: [...input.readiness.blockers],
      evidence: {
        auditEventCountLabel: `${input.readiness.evidence.auditEventCount} 条审计事件`,
        auditDownloadHref: input.readiness.evidence.auditJsonlHref,
        traceIds: [...input.readiness.evidence.traceIds]
      },
      gateAction: {
        label: "运行 Gate",
        action: `/api/v1/releases/${input.readiness.release.id}/gate`
      }
    }
  };
}

export function getReleaseStatusPresentation(
  status: ReleaseReadinessStatus
): ReleaseStatusPresentation {
  if (status === "ready") {
    return {
      label: "就绪",
      tone: "success"
    };
  }

  return {
    label: "阻塞",
    tone: "danger"
  };
}

function toCheckViewModel(check: ReleaseGateCheckDto): ReleaseReadinessViewModel["selected"]["checks"][number] {
  return {
    name: check.name,
    label: check.label,
    detail: check.detail,
    status: {
      label: check.passed ? "通过" : "失败",
      tone: check.passed ? "success" : "danger"
    }
  };
}
