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

## 功能点 3：Approval 页面渲染、Approve/Deny/规则建议与 e2e

### 目标

- `/approvals` 页面实际渲染审批队列，而不是只显示导航。
- 页面展示待审批列表、审批详情、风险解释、工具输入、Approve/Deny 操作和规则建议卡片。
- Approve/Deny/Apply rule 表单通过前端 API client 调用真实 API，操作后刷新 pending 队列。
- e2e 验证审批后队列更新，相关 run 继续或失败。

### 实现

- 更新 `apps/web/src/app/render.ts`。
  - `renderApp()` 在 `/approvals` 路径下调用 `client.listApprovals({ status: "pending" })`。
  - `renderAppHtml()` 支持 `approvalQueue` 输入。
  - 新增 Approval Queue 内容渲染：
    - pending 指标。
    - 审批列表。
    - 审批详情。
    - 风险解释卡片。
    - input JSON。
    - Approve/Deny 表单。
    - 规则建议卡片与 Apply rule 表单。
  - 新增 `bindApprovalForms()`，操作完成后刷新 pending 队列。
- 更新 `apps/web/src/styles.css`。
  - 增加审批布局、风险卡、审批列表、建议卡样式。
- 更新 `apps/web/src/features/approvals/approval-queue-view-model.ts`。
  - 将 `ApprovalDetailViewModel` 改为 `Omit<ApprovalDto, "risk" | "suggestions">` 后重定义 risk/suggestions，保证类型正确表达 view-model 扩展字段。
- 更新 `tests/e2e/frontend-api.e2e.test.ts`。
  - e2e 验证审批队列渲染、approve、deny、apply suggestion 和 pending 队列更新。

### 测试验证

- 新增 `tests/web/approval-render.test.ts`。
  - 覆盖队列、详情、风险解释、工具输入、Approve/Deny action 和规则建议 action。
- 更新 `tests/e2e/frontend-api.e2e.test.ts`。
- 验证命令：
  - `npm run test:web`：25 个 web 测试全部通过。
  - `npm run test:e2e`：4 个 e2e 测试全部通过。

### 问题记录

- 第一版 `ApprovalDetailViewModel` 直接继承 `ApprovalDto` 并重写 `suggestions`，TypeScript 仍将 suggestions 视作原始 DTO 类型，导致渲染层访问 `applyAction` 编译失败。
- 处理方式：使用 `Omit<ApprovalDto, "risk" | "suggestions">` 后重新定义 view-model 字段。

## F4 总体验收

### 已完成范围

- `/approvals` 页面：已接入共享 App Shell，并渲染审批队列。
- 待审批列表：展示工具、任务、运行、原因和风险等级。
- 审批详情：展示风险解释、风险因素、工具输入 JSON。
- Approve / Deny：页面表单通过前端 API client 调用真实 API，并刷新 pending 队列。
- 风险解释：高风险操作使用 danger 语义和风险卡片强化提示。
- 规则建议卡片：展示建议标题、描述和 Apply rule 操作。
- 端到端闭环：approve 后 run effect 为 `continues`，deny 后 run effect 为 `failed`，pending 队列更新。

### 最终验证

- `npm test`：133 个测试全部通过。
- `npm run test:web`：25 个 web 测试全部通过。
- `npm run test:e2e`：4 个端到端测试全部通过。
- `npm run build:web`：通过。

### 未完成或后续增强

- 当前审批操作通过内存 store 更新状态，后续需要接入持久化 ApprovalStore 与 AuditLog。
- 当前 Approve 后仅返回 run effect 语义，后续需要接入真实 run resume 调度。
- 当前 Deny 后仅返回 run failed 语义，后续需要写入任务事件流并刷新 Run Detail。
