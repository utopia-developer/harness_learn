import test from "node:test";
import assert from "node:assert/strict";

import { renderApp, renderAppHtml } from "../../apps/web/src/app/render.js";
import type { ApiClient } from "../../apps/web/src/shared/api/client.js";
import type {
  ListReleasesResponse,
  ReleaseReadinessResponse
} from "../../packages/contracts/src/index.js";

test("release readiness page renders list, checks, blockers and evidence actions", () => {
  const html = renderAppHtml({
    state: "ready",
    pathname: "/releases/release-console-dogfood",
    releaseReadiness: {
      releases: releaseList(),
      readiness: releaseReadiness()
    }
  });

  assert.match(html, /发布就绪/);
  assert.match(html, /Harness Console Dogfood/);
  assert.match(html, /Runtime Baseline/);
  assert.match(html, /阻塞/);
  assert.match(html, /Replay Eval/);
  assert.match(html, /case-console-approval: 输出发生变化/);
  assert.match(html, /2 条审计事件/);
  assert.match(html, /trace-f3-demo/);
  assert.match(html, /release-console-dogfood\/audit\.jsonl/);
  assert.match(html, /data-release-action="run-gate"/);
});

test("release navigation current route loads the latest release id", async () => {
  const requestedReleaseIds: string[] = [];
  const root = createFakeRoot("/releases/current");
  const client = {
    async listReleases() {
      return releaseList();
    },
    async getReleaseReadiness(releaseId: string) {
      requestedReleaseIds.push(releaseId);
      return releaseReadiness();
    }
  } as Partial<ApiClient> as ApiClient;

  await renderApp(root, client);

  assert.deepEqual(requestedReleaseIds, ["release-console-dogfood"]);
  assert.match(root.innerHTML, /发布就绪/);
  assert.doesNotMatch(root.innerHTML, /无法加载页面数据/);
});

function releaseList(): ListReleasesResponse {
  return {
    releases: [
      releaseReadiness().release,
      {
        id: "release-runtime-baseline",
        projectId: "project-harness",
        version: "2026.07.09-runtime",
        title: "Runtime Baseline",
        status: "ready",
        generatedAt: "2026-07-09T00:02:00.000Z"
      }
    ],
    total: 2
  };
}

function releaseReadiness(): ReleaseReadinessResponse {
  return {
    release: {
      id: "release-console-dogfood",
      projectId: "project-harness",
      version: "2026.07.10-console",
      title: "Harness Console Dogfood",
      status: "blocked",
      generatedAt: "2026-07-10T00:02:00.000Z"
    },
    summary: "release-console-dogfood 在 project-harness 项目中仍有阻塞项",
    checks: [
      {
        name: "eval",
        label: "Replay Eval",
        passed: false,
        detail: "case-console-approval: 输出发生变化"
      },
      {
        name: "cost",
        label: "成本预算",
        passed: true,
        detail: "成本 2.1，未超过预算 5"
      }
    ],
    blockers: ["eval: case-console-approval: 输出发生变化"],
    evidence: {
      auditEventCount: 2,
      auditJsonlHref: "/api/v1/releases/release-console-dogfood/audit.jsonl",
      traceIds: ["trace-f3-demo", "trace-f4-approval"]
    }
  };
}

function createFakeRoot(pathname: string): HTMLElement & { innerHTML: string } {
  return {
    innerHTML: "",
    ownerDocument: {
      location: {
        pathname
      }
    },
    querySelectorAll: () => []
  } as unknown as HTMLElement & { innerHTML: string };
}
