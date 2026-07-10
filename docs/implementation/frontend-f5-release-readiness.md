# 前端 F5：Release Readiness 实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F5 范围推进：实现 `/releases` 列表、`/releases/:releaseId` 发布就绪详情、Gate checks、Evidence table、Audit JSONL 导出和 blocked release 原因展示，并通过端到端测试确认前端页面消费真实 API 数据。

## 功能点 1：Release Readiness 契约与 API Gateway

### 目标

- 补齐 F5 后端依赖 API：
  - `GET /api/v1/releases`
  - `GET /api/v1/releases/:releaseId/readiness`
  - `POST /api/v1/releases/:releaseId/gate`
  - `GET /api/v1/releases/:releaseId/audit.jsonl`
- 发布列表包含 ready 与 blocked 两类状态。
- Readiness 详情包含 gate checks、blockers 和 evidence。
- Audit JSONL 通过后端导出，不由前端拼接。

### 实现

- 更新 `packages/contracts/src/index.ts`。
  - 新增 `ReleaseSummaryDto`、`ReleaseGateCheckDto`、`ReleaseEvidenceDto`。
  - 新增 `ListReleasesResponse`、`ReleaseReadinessResponse`、`ReleaseGateActionResponse`。
  - 新增 F5 endpoint builder。
- 新增 `apps/api/src/release-readiness-store.ts`。
  - 使用现有 `runReleaseGate()` 和 `createReleaseReadinessReport()` 生成发布就绪结果。
  - seed 一个 blocked release：`release-console-dogfood`。
  - seed 一个 ready release：`release-runtime-baseline`。
  - 支持 list、readiness、rerun gate 和 audit JSONL 导出。
- 更新 `apps/api/src/server.ts`。
  - 接入 F5 Release Readiness 路由。
  - JSONL 导出使用 `application/jsonl; charset=utf-8`。

### 测试验证

- 更新 `tests/contracts/contracts.test.ts`。
- 新增 `tests/api/release-api.test.ts`。
- 覆盖：
  - 契约 endpoint 和 DTO。
  - 发布列表 ready / blocked 状态。
  - blocked readiness 的 blockers 与 evidence。
  - gate rerun 返回刷新后的 readiness。
  - audit JSONL 导出。
- 验证命令：
  - `npm run build`：通过。
  - `node --test dist/tests/contracts/contracts.test.js dist/tests/api/release-api.test.js`：7 个测试全部通过。

### 问题记录

- 第一轮使用 `npm test -- tests/contracts/contracts.test.ts tests/api/release-api.test.ts` 做针对性验证时，项目脚本会先运行编译后测试，再把源码 TS 路径继续传给 `node --test`，导致 Node 尝试直接执行源码 import 并报 `ERR_MODULE_NOT_FOUND`。
- 处理方式：先运行 `npm run build`，再直接运行编译后的 `dist/tests/...` 测试文件。

## 功能点 2：前端 Release API Client、Mock 与 View-model

### 目标

- 前端通过 typed API client 调用 F5 endpoints。
- Mock client 提供同形状 release 数据，保证无后端时也能渲染 F5 页面。
- Release Readiness view-model 统一处理：
  - 发布列表。
  - ready / blocked 状态视觉。
  - Gate checks。
  - Blockers。
  - Evidence 与 Audit JSONL 下载入口。
  - Run gate 操作元数据。

### 实现

- 更新 `apps/web/src/shared/api/client.ts`。
  - 新增 `listReleases()`。
  - 新增 `getReleaseReadiness(releaseId)`。
  - 新增 `runReleaseGate(releaseId)`。
  - 新增 `getReleaseAuditJsonl(releaseId)`。
- 更新 `apps/web/src/shared/api/mock.ts`。
  - 新增 blocked release 和 ready release mock 数据。
  - mock client 同步补齐 F5 方法。
- 新增 `apps/web/src/features/releases/release-readiness-view-model.ts`。
  - `createReleaseReadinessViewModel()` 输出发布摘要、发布列表、选中 release 详情、checks、blockers、evidence 和 gate action。
  - `getReleaseStatusPresentation()` 将 `ready/blocked` 映射为 `success/danger`。

### 测试验证

- 新增 `tests/web/api-client-release.test.ts`。
  - 验证 list、readiness、run gate 和 audit JSONL 的路径与 POST 方法。
- 新增 `tests/web/release-readiness-view-model.test.ts`。
  - 验证发布摘要、列表链接、blocked 状态、checks、blockers、evidence 和 Run gate action。
- 验证命令：`npm run test:web`。
- 当前结果：28 个 web 测试全部通过。

### 问题记录

- F5 扩展 `ApiClient` 后，mock client 必须同步补齐 release 方法，否则 `createMockApiClient()` 不满足接口。
- 处理方式：mock 数据复用真实契约 DTO，避免真实 API 与 mock API 漂移。

## 功能点 3：Release Readiness 页面渲染、Run Gate 与 e2e

### 目标

- `/releases` 和 `/releases/:releaseId` 页面实际渲染发布就绪数据。
- 页面展示发布列表、ready / blocked 状态、Gate checks、blocked 原因、Evidence table 和 Audit JSONL 导出入口。
- Run gate 表单通过前端 API client 调用真实 API，并刷新 readiness。
- e2e 验证 release readiness 页面不是孤立 UI。

### 实现

- 更新 `apps/web/src/app/render.ts`。
  - `renderApp()` 在 `/releases` 路径下调用 `client.listReleases()`。
  - `/releases/:releaseId` 调用 `client.getReleaseReadiness(releaseId)`。
  - `/releases` 默认选中列表第一条 release。
  - `renderAppHtml()` 支持 `releaseReadiness` 输入。
  - 新增 Release Readiness 页面内容渲染：
    - release 指标。
    - 发布列表。
    - release 详情。
    - gate checks。
    - blocked reasons。
    - evidence table。
    - Audit JSONL 链接。
    - Run gate 表单。
  - 新增 `bindReleaseForms()`，Run gate 后刷新发布列表和 readiness。
- 更新 `apps/web/src/styles.css`。
  - 增加 release 布局、发布列表、详情、checks 和 evidence table 样式。

### 测试验证

- 新增 `tests/web/release-render.test.ts`。
  - 覆盖发布列表、blocked 状态、checks、blockers、evidence、Audit JSONL 和 Run gate 表单。
- 更新 `tests/e2e/frontend-api.e2e.test.ts`。
  - e2e 验证 release list、readiness、run gate、audit JSONL 和页面渲染。
- 验证命令：
  - `npm run test:web`：29 个 web 测试全部通过。
  - `npm run test:e2e`：5 个端到端测试全部通过。

### 问题记录

- `/releases` 没有明确 releaseId 时需要避免空白页。
- 处理方式：先拉取 release list，若路径未指定 releaseId，则默认展示列表第一条 release 的 readiness。

## F5 总体验收

### 已完成范围

- `/releases` 页面：已接入共享 App Shell，并默认展示第一条 release 的 readiness。
- `/releases/:releaseId` 页面：已渲染指定 release 的发布就绪详情。
- 发布列表：展示 release 标题、版本、生成时间和 ready / blocked 状态。
- Gate checks：展示 Eval、成本和质量检查结果。
- Blocked reasons：blocked release 给出明确阻塞原因。
- Evidence table：展示审计事件数量、Trace IDs 和 Audit JSONL 导出链接。
- Run gate：页面表单通过前端 API client 调用真实 API，并刷新 readiness。
- 端到端闭环：release list、readiness、run gate、audit JSONL 和页面渲染均通过真实 API gateway 验证。

### 最终验证

- `npm test`：143 个测试全部通过。
- `npm run test:web`：29 个 web 测试全部通过。
- `npm run test:e2e`：5 个端到端测试全部通过。
- `npm run build:web`：通过。

### 未完成或后续增强

- 当前 release 数据通过 API gateway 内存 store seed，后续需要接入持久化 ReleaseStore、EvalStore、CostQualityDashboard 和 AuditLog。
- 当前 Run gate 为同步返回刷新结果，后续生产化需要支持后台 gate job、运行中状态和失败重试。
- 当前 Audit JSONL 直接返回完整文本，后续需要支持大文件分页、签名下载或对象存储引用。
- 当前页面使用静态 HTML 渲染模式，后续接入 React/Vite 后应迁移为组件化页面并保留同等契约测试。
