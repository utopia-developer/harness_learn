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

## 功能点 2：前端 Metrics API Client、Mock 与 View-model

### 目标

- 前端通过 typed API client 调用 F7 metrics endpoints。
- Mock client 提供同形状 metrics 数据，保证无后端时也能渲染 F7 页面。
- Metrics view-model 统一处理：
  - 成本金额格式化。
  - 通过率和成功率百分比。
  - 模型、工具、Skill 成本归因。
  - Eval 质量趋势点。
  - Runtime 状态分布和审批等待时长。

### 实现

- 更新 `apps/web/src/shared/api/client.ts`。
  - 新增 `getMetricsCost(projectId)`。
  - 新增 `getMetricsQuality(projectId)`。
  - 新增 `getMetricsRuntime(projectId)`。
- 更新 `apps/web/src/shared/api/mock.ts`。
  - mock client 同步补齐 F7 方法。
  - 提供成本、质量和 runtime mock 数据。
- 新增 `apps/web/src/features/metrics/metrics-view-model.ts`。
  - `createMetricsViewModel()` 输出 summary、cost、quality 和 runtime 分区。
  - 统一格式化金额、百分比和审批等待时长。

### 测试验证

- 新增 `tests/web/api-client-metrics.test.ts`。
  - 验证 cost、quality、runtime 三条 API 路径。
- 新增 `tests/web/metrics-view-model.test.ts`。
  - 验证成本归因、质量趋势、成功率、审批等待时长和状态分布。
- 验证命令：`npm run test:web`。
- 当前结果：36 个 web 测试全部通过。

### 问题记录

- F7 扩展 `ApiClient` 后，mock client 必须同步补齐 metrics 方法，否则 `createMockApiClient()` 不满足接口。
- 处理方式：mock 数据复用真实契约 DTO，保证真实 API 与 mock API 形状一致。

## 功能点 3：Metrics 页面渲染与 e2e

### 目标

- `/metrics` 页面实际渲染成本、质量和 runtime 指标。
- App Shell 导航新增 Metrics 入口。
- 页面展示：
  - 总成本、Eval 通过率、Run 成功率。
  - 模型成本、工具成本、Skill 成本归因。
  - Eval 质量趋势。
  - Run 状态分布、平均迭代次数和平均审批等待时长。
- e2e 验证前端通过真实 API gateway 拉取三类指标后渲染页面。

### 实现

- 更新 `apps/web/src/app/shell.ts`。
  - 新增 `metrics` 页面和导航项。
  - `/metrics` 路径激活 Metrics 导航。
- 更新 `apps/web/src/app/render.ts`。
  - `/metrics` 路径并行调用 `client.getMetricsCost()`、`client.getMetricsQuality()`、`client.getMetricsRuntime()`。
  - `renderAppHtml()` 支持 `metrics` 输入。
  - 新增 Metrics 页面内容渲染：
    - 顶部指标卡。
    - 成本归因卡。
    - Runtime health 卡。
    - Quality trend 列表。
- 更新 `apps/web/src/styles.css`。
  - 增加 metrics 布局、成本归因、runtime 状态格和质量趋势样式。
- 更新 `tests/web/web-boundary.test.ts`。
  - 将 `/metrics` 纳入前端产品路由边界。

### 测试验证

- 更新 `tests/web/app-shell.test.ts`。
- 新增 `tests/web/metrics-render.test.ts`。
- 更新 `tests/e2e/frontend-api.e2e.test.ts`。
- 验证命令：
  - `npm run test:web`：37 个 web 测试全部通过。
  - `npm run test:e2e`：7 个端到端测试全部通过。

### 问题记录

- 新增 `/metrics` 导航后，`tests/web/web-boundary.test.ts` 仍只接受原有 5 条路由。
- 处理方式：同步更新边界测试，明确 `/metrics` 属于产品路由契约的一部分。
