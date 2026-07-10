# Frontend F8 Production Hardening Implementation Notes

## Scope

F8 closes the frontend product loop for production hardening:

- Session and role-based access control.
- API-backed frontend audit events.
- Frontend API error boundaries.
- Explicit confirmation for risky approval actions.
- Accessibility and performance-budget checks for core pages.

## Feature 1: Session, RBAC and Frontend Audit API

### What Changed

- Added shared contract types for `UserRole`, `SessionResponse`, `FrontendAuditEventRequest`, and `FrontendAuditEventResponse`.
- Added stable endpoints:
  - `GET /api/v1/session`
  - `POST /api/v1/frontend/audit-events`
- Extended the API request shape to carry headers from both Node HTTP requests and direct test calls.
- Added lightweight demo-session parsing from `x-harness-user-id` and `x-harness-role`.
- Enforced admin-only mutation for project policy and plugin management APIs.
- Added an in-memory frontend audit store that records actor, role, action, target, route, metadata, and timestamp.

### Design Notes

- The default role remains `admin` when no role header is present. This keeps the local demo and existing tests usable while still enabling explicit viewer/developer/admin validation.
- RBAC is enforced in the API layer, not only in the UI, so disabled frontend controls are not the only protection.
- The audit store is intentionally in-memory for F8. It establishes the product/API contract without introducing persistence before authentication and database choices are finalized.

### Verification

- `npm test`
  - Result: 167 tests passed.
  - Coverage added for session permissions, non-admin policy denial, admin policy mutation, and frontend audit recording.

### Issues Encountered

- The initial red test failed at compile time because the shared contracts and request header shape did not exist yet. This was expected and confirmed the missing integration points before implementation.

## Feature 2: Web Session Client, Audit Client and Session View Model

### What Changed

- Extended `createApiClient` with optional `session` context:
  - `userId` is sent as `x-harness-user-id`.
  - `role` is sent as `x-harness-role`.
- Added web client methods:
  - `getSession()`
  - `recordFrontendAudit(input)`
- Added session-aware request header injection while preserving existing API client call sites.
- Updated the mock API client with default admin session and mock frontend audit responses.
- Added `createSessionViewModel()` to translate backend session permissions into UI affordances.

### Design Notes

- Header injection is centralized in the API client factory so feature pages do not manually attach RBAC headers.
- The session view model returns permission booleans and readonly messages. Pages can disable controls and explain restrictions without duplicating role logic.
- The mock API client uses admin by default to keep local static rendering and existing page tests aligned with the demo environment.

### Verification

- `npm run test:web`
  - Result: 39 tests passed.
  - Coverage added for session header propagation, session endpoint usage, frontend audit posting, and role-to-UI permission mapping.

### Issues Encountered

- The first web red test failed because `ApiClientOptions.session`, `getSession()`, `recordFrontendAudit()`, and the session view-model module did not exist. This confirmed the intended web integration surface before implementation.

## Feature 3: Page-Level Hardening, Confirmation, Accessibility and Budgets

### What Changed

- Threaded `SessionResponse` into `renderAppHtml()` and relevant runtime routes.
- Added role badges in the shell when a session is present.
- Rendered project policy controls as readonly for non-admin users:
  - Policy checkboxes are disabled.
  - Save action is disabled.
  - A role restriction message is shown.
- Rendered plugin action buttons as disabled for non-admin users.
- Added required explicit confirmation for high-risk approval actions.
- Added frontend audit events for approval, policy, plugin and policy simulation form submissions.
- Generalized the API error boundary title to page-level data loading failure.
- Extended `ApprovalActionRequest` with `confirmedRisk` so UI confirmation is preserved in the request payload.
- Added a large Trace render budget test.
- Added E2E coverage for viewer sessions being denied by the real API path.

### Design Notes

- UI-level disabling improves operator clarity, while API-level RBAC remains the source of truth.
- High-risk approvals require an explicit checkbox only on the approve path. Deny remains available without confirmation because it does not execute the risky operation.
- Audit recording is performed before mutations so operator intent is captured with route and target context.
- The large Trace budget is intentionally checked in Node render tests because the current project does not include Playwright. It still guards the template from accidental unbounded output growth.

### Verification

- `npm run test:web`
  - Result: 41 tests passed.
- `npm run test:e2e`
  - Result: 8 tests passed.

### Issues Encountered

- The first performance-budget assertion expected raw event ids in the HTML, but the page renders event titles rather than ids. The assertion was corrected to validate visible event content instead of an implementation detail.

## Follow-up Fix: Dogfood Runtime Gaps

### What Changed

- Fixed the local web dev server API proxy:
  - Forwards request headers into the API gateway.
  - Reads and forwards JSON bodies for `POST`, `PUT`, and `PATCH`.
  - Preserves plain-text API responses such as JSONL exports instead of double-encoding them.
- Added SPA fallback routing so direct browser visits to `/tasks`, `/approvals`, `/settings/policy`, `/settings/plugins`, `/metrics`, and run detail URLs serve `index.html`.
- Added static ES module fallback for `/assets/**/*.js` so browser module imports from `main.js` can load compiled files under `dist/apps/web/src`.
- Moved web dev server startup behind a main-module guard and exported pure helpers for regression tests.
- Enforced high-risk approval confirmation at the API layer, not only in the UI.
- Added `.DS_Store` to `.gitignore` to keep macOS metadata out of working tree status.

### Design Notes

- Browser dogfood must use the same request semantics as tests. The dev server now passes method, URL, headers, and parsed body into `handleApiRequest()`.
- UI confirmation remains useful for operators, but API confirmation is now the security boundary for high-risk approvals.
- The server keeps framework-free static serving, but app routes now behave like a single-page console during local verification.

### Verification

- `npm run build`
  - Result: TypeScript build passed.
- `npm run test:web`
  - Result: 43 tests passed.
- `npm run test:e2e`
  - Result: 8 tests passed.
- `npm run build:web`
  - Result: TypeScript build passed.
- `npm test`
  - Result: 175 tests passed.

### Issues Encountered

- The first red test failed at compile time because `createApiGatewayRequest()` and `resolveWebAsset()` did not exist. The dev server was refactored to expose these helpers and keep runtime startup side-effect free when imported by tests.
- After adding `confirmedRisk` to high-risk approval calls, an existing API client assertion still expected the old request body. The assertion was updated to match the stricter API contract.
- The first browser verification showed a blank page because `/assets/main.js` loaded but its relative ES module imports, such as `/assets/app/render.js`, returned 404. The dev server now maps nested `/assets/**/*.js` requests to compiled web modules.
