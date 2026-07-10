# 前端 F7：Metrics、质量与成本分析实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F7 范围推进：实现 `/metrics` 指标分析页、模型成本趋势、工具调用成本、Skill 成本归因、Eval 质量趋势、Run 成功率、平均迭代次数和等待审批时长，并通过端到端测试确认前端页面消费真实 API 数据。

## 功能点 1：Metrics 契约与 API Gateway

### 目标

- 补齐 F7 后端依赖 API：
  - `GET /api/v1/metrics/cost?projectId=project-harness`
  - `GET /api/v1/metrics/quality?projectId=project-harness`
  - `GET /api/v1/metrics/runtime?projectId=project-harness`
- 成本指标包含模型、工具和 Skill 归因。
- 质量指标复用 Release Gate 使用的质量趋势口径。
- Runtime 指标包含 Run 成功率、平均迭代次数和平均审批等待时长。

### 实现

- 更新 `packages/contracts/src/index.ts`。
  - 新增 `MetricsCostResponse`、`MetricsQualityResponse`、`MetricsRuntimeResponse`。
  - 新增成本分解和质量趋势点 DTO。
  - 新增 F7 endpoint builder。
  - 新增 `/metrics` 前端路由。
- 新增 `apps/api/src/metrics-store.ts`。
  - 复用现有 `createCostQualityDashboard()` 作为成本和质量聚合来源。
  - seed 模型成本、工具成本、Skill 归因和质量趋势。
  - 新增 runtime records seed，聚合 Run 成功率、平均迭代次数和审批等待时长。
- 更新 `apps/api/src/server.ts`。
  - 接入 cost、quality、runtime 三条 metrics API。
  - 支持通过 `projectId` 查询项目指标，默认 `project-harness`。

### 测试验证

- 更新 `tests/contracts/contracts.test.ts`。
- 新增 `tests/api/metrics-api.test.ts`。
- 覆盖：
  - F7 endpoint 和 DTO。
  - 模型、工具和 Skill 成本归因。
  - Eval 质量趋势、通过率和平均分。
  - Run 成功率、平均迭代次数和审批等待时长。
- 验证命令：
  - `npm run build`：通过。
  - `node --test dist/tests/contracts/contracts.test.js dist/tests/api/metrics-api.test.js`：8 个测试全部通过。

### 问题记录

- Runtime 运行效率指标尚无已有核心 store。
- 处理方式：F7 先新增 API gateway 内存 runtime metrics seed，后续生产化再接入任务事件流和 Trace 聚合。
