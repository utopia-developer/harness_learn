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

## 功能点 2：前端 Task Center API Client 与 View-model

### 目标

- 前端通过 typed API client 调用 F2 endpoints。
- Task Center 页面状态由 view-model 聚合，而不是在渲染层散落业务口径。
- 明确区分任务状态视觉语义，覆盖 `pending`、`running`、`waiting_approval`、`completed`、`failed` 等关键状态。

### 实现

- 更新 `apps/web/src/shared/api/client.ts`。
  - 新增 `listTasks(query)`。
  - 新增 `createTask(input)`。
  - 新增 `getReleaseSummary()`。
  - 新增 `getMetricsSummary()`。
  - POST 请求统一发送 JSON body 和 `content-type: application/json`。
- 更新 `apps/web/src/shared/api/mock.ts`。
  - mock client 补齐 F2 方法，保持与真实 API client 同一接口。
- 新增 `apps/web/src/features/tasks/task-center-view-model.ts`。
  - 聚合任务列表、release summary 和 metrics summary。
  - 输出 health metric cards。
  - 输出任务行 view-model：状态 Badge、release gate Badge、成本、Trace 数、待审批数、详情链接。
  - 提供 `getTaskStatusPresentation()` 统一任务状态视觉语义。

### 测试验证

- 新增 `tests/web/api-client-task-center.test.ts`。
  - 验证 task list query 参数、create task POST body、release summary、metrics summary 调用。
- 新增 `tests/web/task-center-view-model.test.ts`。
  - 验证任务健康摘要。
  - 验证状态视觉语义。
- 验证命令：`npm run test:web`。
- 当前结果：14 个 web 测试全部通过。

### 问题记录

- 扩展 `ApiClient` 接口后，`createMockApiClient()` 未实现新增方法，导致 TypeScript 编译失败。
- 处理方式：mock client 同步补齐 F2 方法，避免 mock 与真实 API client 契约漂移。

## 功能点 3：Task Center 页面渲染、筛选搜索排序与创建闭环

### 目标

- `/tasks` 页面实际渲染 Task Center，而不是复用 F0 Console Dashboard。
- 页面展示任务健康摘要、状态筛选、搜索、排序、新建任务表单、任务列表和详情跳转。
- 新建任务表单提交到真实 API client，创建后刷新任务列表。
- 端到端验证前端创建任务后能在页面列表中看到新任务。

### 实现

- 更新 `apps/web/src/app/render.ts`。
  - `renderApp()` 在 `/tasks` 路径下调用：
    - `client.listTasks()`
    - `client.getReleaseSummary()`
    - `client.getMetricsSummary()`
  - `renderAppHtml()` 支持 `taskCenter` 输入。
  - 新增 Task Center 内容渲染：
    - health metrics
    - filter/search/sort form
    - 新建任务 drawer 风格表单
    - task table
    - 详情链接 `/tasks/:taskId/runs/latest`
  - 新增 `bindTaskCreateForm()`，拦截新建任务表单提交，调用 `client.createTask()` 后刷新列表。
- 新增 `apps/web/src/features/tasks/task-create-form.ts`。
  - 将 `FormData` 转为 `CreateTaskRequest`。
  - 对空目标做错误校验。
- 更新 `apps/web/src/styles.css`。
  - 增加 Task Center 表单、表格、Badge 样式。
  - 保持移动端单列布局。
- 更新 `tests/e2e/frontend-api.e2e.test.ts`。
  - 通过前端 API client 调用 API gateway 创建任务。
  - 再读取任务列表、release summary、metrics summary。
  - 最后渲染页面 HTML 并断言新任务出现在 Task Center 中。

### 测试验证

- 新增 `tests/web/task-center-render.test.ts`。
  - 覆盖 health summary、筛选/search/sort 控件、新建任务表单、任务行、状态 Badge、详情链接。
- 新增 `tests/web/task-create-form.test.ts`。
  - 覆盖表单字段到 `CreateTaskRequest` 的映射。
  - 覆盖空 goal 校验。
- 更新 `tests/e2e/frontend-api.e2e.test.ts`。
- 验证命令：
  - `npm run test:web`：17 个 web 测试全部通过。
  - `npm run test:e2e`：2 个 e2e 测试全部通过。

### 问题记录

- 第一版页面只有 HTML 表单，如果浏览器默认提交，将无法发送 JSON body 到 `POST /api/v1/tasks`。
- 处理方式：在 `renderApp()` 挂载后绑定表单 submit 事件，使用 `FormData -> CreateTaskRequest -> client.createTask()` 的前端 API client 路径创建任务，再刷新列表。

## F2 总体验收

### 已完成范围

- `/tasks` 页面：已接入共享 App Shell，并渲染 Task Center 内容。
- 任务列表：展示任务目标、状态、审批数、Release Gate、成本和详情链接。
- 状态筛选、搜索、排序：API、client、页面控件均已覆盖。
- 新建任务：页面表单通过前端 API client 调用 `POST /api/v1/tasks`，创建后刷新列表。
- 健康摘要：active tasks、waiting approval、release gates、cost today 已由 metrics/release summary 聚合展示。
- 任务详情跳转：任务行提供 `/tasks/:taskId/runs/latest` 链接。
- 状态视觉区分：`pending`、`running`、`waiting_approval`、`completed`、`failed` 均有明确展示语义。

### 最终验证

- `npm test`：115 个测试全部通过。
- `npm run test:web`：17 个 web 测试全部通过。
- `npm run test:e2e`：2 个端到端测试全部通过。
- `npm run build:web`：通过。

### 未完成或后续增强

- 当前任务 store 是 API gateway 内的最小内存实现，后续应接入已有 `FileTaskService` 或持久化数据库，以支持跨进程任务历史。
- 当前筛选/search/sort 的浏览器表单会生成 URL 查询参数；后续接入 Router 后应同步 URL state 和页面重载逻辑。
- 当前任务详情链接先落到 `/tasks/:taskId/runs/latest`，F3 会实现真实 Run Detail 与 Trace Timeline 页面。
