import test from "node:test";
import assert from "node:assert/strict";

import { createApiClient } from "../../apps/web/src/shared/api/client.js";

test("api client calls release readiness endpoints", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createApiClient({
    baseUrl: "http://harness.local",
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });

      if (url.endsWith("/audit.jsonl")) {
        return new Response("{\"action\":\"release.gate.started\"}", {
          status: 200,
          headers: { "content-type": "application/jsonl" }
        });
      }
      if (url.endsWith("/gate")) {
        return jsonResponse({
          releaseId: "release-console-dogfood",
          status: "blocked",
          message: "Release release-console-dogfood gate evaluated as blocked.",
          readiness: readiness()
        });
      }
      if (url.endsWith("/readiness")) {
        return jsonResponse(readiness());
      }
      return jsonResponse({
        releases: [readiness().release],
        total: 1
      });
    }
  });

  await client.listReleases();
  await client.getReleaseReadiness("release-console-dogfood");
  await client.runReleaseGate("release-console-dogfood");
  const auditJsonl = await client.getReleaseAuditJsonl("release-console-dogfood");

  assert.deepEqual(calls.map((call) => call.url), [
    "http://harness.local/api/v1/releases",
    "http://harness.local/api/v1/releases/release-console-dogfood/readiness",
    "http://harness.local/api/v1/releases/release-console-dogfood/gate",
    "http://harness.local/api/v1/releases/release-console-dogfood/audit.jsonl"
  ]);
  assert.equal(calls[2].init?.method, "POST");
  assert.match(auditJsonl, /release.gate.started/);
});

function readiness() {
  return {
    release: {
      id: "release-console-dogfood",
      projectId: "project-harness",
      version: "2026.07.10-console",
      title: "Harness Console Dogfood",
      status: "blocked",
      generatedAt: "2026-07-10T00:02:00.000Z"
    },
    summary: "Release release-console-dogfood is blocked for project project-harness",
    checks: [
      {
        name: "eval",
        label: "Replay Eval",
        passed: false,
        detail: "case-console-approval: Output changed"
      }
    ],
    blockers: ["eval: case-console-approval: Output changed"],
    evidence: {
      auditEventCount: 2,
      auditJsonlHref: "/api/v1/releases/release-console-dogfood/audit.jsonl",
      traceIds: ["trace-f3-demo"]
    }
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
