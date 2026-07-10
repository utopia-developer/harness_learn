# 前端 F4：Approval Queue 实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F4 范围推进：实现 `/approvals` 审批队列、审批详情、Approve/Deny 操作、风险解释、规则建议卡片，并通过端到端测试确认审批后队列更新和相关 run 状态语义变化。

## 功能点 1：Approval Queue 契约与 API Gateway

### 目标

- 补齐 F4 后端依赖 API：
  - `GET /api/v1/approvals?status=pending`
  - `POST /api/v1/approvals/:approvalId/approve`
  - `POST /api/v1/approvals/:approvalId/deny`
  - `POST /api/v1/policies/suggestions/:suggestionId/apply`
- 审批列表包含风险解释和规则建议。
- Approve 后队列更新，并表达 run 可继续。
- Deny 后表达相关 run 失败。

### 实现

- 更新 `packages/contracts/src/index.ts`。
  - 新增 `ApprovalDto`、`ApprovalRiskDto`、`PolicySuggestionDto`。
  - 新增 `ApprovalQueueResponse`、`ApprovalActionRequest`、`ApprovalActionResponse`。
  - 新增 policy suggestion apply response 与 F4 endpoint builder。
- 新增 `apps/api/src/approval-queue-store.ts`。
  - 提供最小审批队列 store。
  - seed 两条待审批：`run_command` 高风险、`write_file` 中风险。
  - 支持 list、approve、deny、applySuggestion。
- 更新 `apps/api/src/server.ts`。
  - 接入审批列表、approve、deny 和 policy suggestion apply 路由。
  - 支持按 status 查询审批队列。

### 测试验证

- 新增 `tests/api/approval-api.test.ts`。
- 覆盖：
  - pending 审批列表。
  - 风险解释和规则建议。
  - approve 后从 pending 队列移除，并返回 run continues。
  - deny 后返回 run failed。
  - policy suggestion apply。
- 验证命令：`npm test`。
- 当前结果：128 个测试全部通过。

### 问题记录

- 当前审批队列 store 是 API gateway 内存实现，适合 F4 前端闭环验证。
- 后续生产化需要接入持久化 ApprovalStore、AuditLog 和真实 Run 调度恢复/失败机制。

## 功能点 2：前端 Approval API Client 与 Queue View-model

### 目标

- 前端通过 typed API client 调用 F4 endpoints。
- Approval Queue view-model 统一处理风险视觉、详情面板、Approve/Deny 操作和规则建议卡片。
- 高风险操作具备强视觉语义，不依赖渲染层临时判断。

### 实现

- 更新 `apps/web/src/shared/api/client.ts`。
  - 新增 `listApprovals({ status })`。
  - 新增 `approveApproval(approvalId, input)`。
  - 新增 `denyApproval(approvalId, input)`。
  - 新增 `applyPolicySuggestion(suggestionId)`。
- 更新 `apps/web/src/shared/api/mock.ts`。
  - mock client 同步补齐 F4 方法。
  - 提供高风险 `run_command` 审批样例。
- 新增 `apps/web/src/features/approvals/approval-queue-view-model.ts`。
  - `createApprovalQueueViewModel()` 输出审批列表、选中详情、风险展示、操作按钮、规则建议。
  - `getApprovalRiskPresentation()` 将 `high/medium/low` 映射到 `danger/warning/success`。

### 测试验证

- 新增 `tests/web/api-client-approval.test.ts`。
  - 验证 list、approve、deny、apply suggestion 的路径和 POST body。
- 新增 `tests/web/approval-queue-view-model.test.ts`。
  - 验证风险视觉、详情 input JSON、Approve/Deny 按钮和规则建议按钮。
- 验证命令：`npm run test:web`。
- 当前结果：24 个 web 测试全部通过。

### 问题记录

- F4 扩展 `ApiClient` 后，mock client 必须同步补齐，否则前端测试无法编译。
- 处理方式：mock client 返回同形状审批队列、审批结果和规则建议应用结果，保证真实 API 与 mock API 接口一致。
