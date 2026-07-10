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
