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
