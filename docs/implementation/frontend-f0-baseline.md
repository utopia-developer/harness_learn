# 前端 F0：工程基线实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F0 范围推进：建立前端工程骨架、契约开发方式、Mock/API 分离能力，并通过端到端测试证明前端不是孤立 UI。

## 功能点 1：Contracts 契约包

### 目标

- 建立前后端分离的类型契约边界。
- 前端后续只依赖 `packages/contracts`，不直接 import 后端 `src/*`。
- 先覆盖 F0 需要的 Console Dashboard、Web 路由和 API 路径。

### 实现

- 新增 `packages/contracts/src/index.ts`。
- 导出：
  - `TaskStatus`
  - `TraceStatus`
  - `ConsoleDashboardResponse`
  - `API_ENDPOINTS`
  - `WEB_ROUTES`
- 更新 `tsconfig.json`，让 `packages/**/*.ts` 参与根构建。

### 测试验证

- 新增 `tests/contracts/contracts.test.ts`。
- 覆盖路由、API endpoint 常量和 Console Dashboard DTO 结构。
- 验证命令：`npm test`。
- 当前结果：91 个测试全部通过。

### 问题记录

- 当前契约是手写 TypeScript 类型，尚未引入 OpenAPI 生成链路。
- 后续 API 增多后，应将 `packages/contracts` 切换为 OpenAPI schema + generated types。

## 功能点 2：API 网关基线

### 目标

- 建立前端可访问的最小 API 边界。
- F0 不重新实现后端业务逻辑，只将 HTTP endpoint 映射到已有 harness 后端能力。
- 通过测试证明 Console Dashboard 数据来自 `src/console/console-view.ts` 的聚合结果。

### 实现

- 新增 `apps/api/src/server.ts`。
  - 暴露 `GET /api/v1/health`。
  - 暴露 `GET /api/v1/console/dashboard`。
  - `createApiServer()` 负责真实 Node HTTP server。
  - `handleApiRequest()` 负责可测试的路由逻辑。
- 新增 `apps/api/src/dashboard-fixture.ts`。
  - 使用 `TaskRecord`、`AgentTrace`、`ApprovalRecord` 构造 F0 demo 数据。
  - 调用 `createConsoleDashboard()` 生成 `ConsoleDashboardResponse`。
- 新增 `apps/api/src/index.ts`，支持本地启动 API 服务。
- 更新 `tsconfig.json`，让 `apps/api/src/**/*.ts` 参与根构建。

### 测试验证

- 新增 `tests/api/api-server.test.ts`。
- 覆盖 health endpoint 和 console dashboard endpoint。
- 验证命令：`npm test`。
- 当前结果：93 个测试全部通过。

### 问题记录

- 测试环境不允许监听 `127.0.0.1`，真实 `server.listen()` 会得到 `EPERM`。
- 处理方式：将 API 路由处理提取为 `handleApiRequest()` 纯函数，测试覆盖同一路由逻辑；生产和本地开发仍通过 `createApiServer()` 启动真实 HTTP server。
