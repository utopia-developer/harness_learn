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
