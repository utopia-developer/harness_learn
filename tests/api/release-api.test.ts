import test from "node:test";
import assert from "node:assert/strict";

import {
  API_ENDPOINTS,
  type ListReleasesResponse,
  type ReleaseGateActionResponse,
  type ReleaseReadinessResponse
} from "../../packages/contracts/src/index.js";
import { handleApiRequest } from "../../apps/api/src/server.js";

test("api server lists releases with ready and blocked statuses", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.releases
  });
  const body = response.body as ListReleasesResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.total, 2);
  assert.deepEqual(body.releases.map((release) => release.id), [
    "release-console-dogfood",
    "release-runtime-baseline"
  ]);
  assert.deepEqual(body.releases.map((release) => release.status), ["blocked", "ready"]);
});

test("api server exposes release readiness with blockers and evidence", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.releaseReadiness("release-console-dogfood")
  });
  const body = response.body as ReleaseReadinessResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.release.id, "release-console-dogfood");
  assert.equal(body.release.status, "blocked");
  assert.equal(body.checks.length, 3);
  assert.ok(body.blockers.some((blocker) => blocker.includes("eval")));
  assert.equal(body.evidence.auditEventCount, 2);
  assert.equal(
    body.evidence.auditJsonlHref,
    API_ENDPOINTS.releaseAuditJsonl("release-console-dogfood")
  );
  assert.deepEqual(body.evidence.traceIds, ["trace-f3-demo", "trace-f4-approval"]);
});

test("api server reruns a release gate and returns the refreshed readiness", async () => {
  const response = await handleApiRequest({
    method: "POST",
    url: API_ENDPOINTS.runReleaseGate("release-console-dogfood")
  });
  const body = response.body as ReleaseGateActionResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.releaseId, "release-console-dogfood");
  assert.equal(body.status, "blocked");
  assert.match(body.message, /gate evaluated/i);
  assert.ok(body.readiness.blockers.length > 0);
});

test("api server exports release audit evidence as jsonl", async () => {
  const response = await handleApiRequest({
    method: "GET",
    url: API_ENDPOINTS.releaseAuditJsonl("release-console-dogfood")
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/jsonl; charset=utf-8");
  assert.equal(typeof response.body, "string");
  assert.match(response.body as string, /release.gate.started/);
  assert.match(response.body as string, /release.gate.completed/);
});
