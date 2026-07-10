# 前端 F2：Task Center 实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F2 范围推进：实现 `/tasks` 任务中心、任务列表、状态筛选、搜索、排序、新建任务入口、任务健康摘要和任务详情跳转，并通过端到端测试确认前端页面消费真实 API 数据。

## 功能点 1：Task Center 契约与 API Gateway

### 目标

- 补齐 F2 后端依赖的 API 契约：
  - `GET /api/v1/tasks`
  - `POST /api/v1/tasks`
  - `GET /api/v1/releases/summary`
  - `GET /api/v1/metrics/summary`
- 任务列表支持状态筛选、搜索和排序。
- 创建任务后，后续任务列表可以看到新任务，避免前端只有静态表单。
- 任务健康摘要从同一份任务数据派生 active、waiting approval、release gate 和 cost today 口径。

### 实现

- 更新 `packages/contracts/src/index.ts`。
  - 新增 `TaskCenterTaskDto`、`ListTasksQuery`、`ListTasksResponse`、`CreateTaskRequest`、`CreateTaskResponse`。
  - 新增 `ReleaseSummaryResponse` 和 `MetricsSummaryResponse`。
  - 新增 F2 API endpoint 常量。
- 新增 `apps/api/src/task-center-store.ts`。
  - 提供最小 Task Center store。
  - seed 数据复用 F0 Console Dashboard demo 任务，并补充 running 任务形成健康摘要。
  - 支持 list、create、release summary、metrics summary。
- 更新 `apps/api/src/server.ts`。
  - `handleApiRequest()` 升级为 async。
  - 支持 GET/POST tasks、release summary、metrics summary。
  - `createApiServer()` 支持读取 JSON body 后委托 `handleApiRequest()`。
- 更新 `apps/web/dev-server.ts`。
  - API 代理保留 query string，支持本地筛选与搜索。

### 测试验证

- 更新 `tests/api/api-server.test.ts`。
- 覆盖：
  - 任务列表状态筛选、搜索、排序。
  - 创建任务后可从任务列表查询到。
  - release summary 和 metrics summary。
- 验证命令：`npm test`。
- 当前结果：108 个测试全部通过。

### 问题记录

- `handleApiRequest()` 从同步函数升级为异步函数后，既有 e2e 测试仍按同步返回读取 `body/statusCode/headers`，TypeScript 编译失败。
- 处理方式：更新 `tests/e2e/frontend-api.e2e.test.ts` 中的 fetch 注入逻辑，显式 `await handleApiRequest()`。
