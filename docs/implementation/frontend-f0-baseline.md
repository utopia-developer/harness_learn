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

## 功能点 3：Web 前端工程骨架

### 目标

- 建立 `apps/web` 前端工程边界。
- 前端只通过 `packages/contracts` 和 HTTP API client 消费后端能力，不直接导入后端 `src/*`。
- 提供可运行的 Console Dashboard 首屏，避免只有导航或 icon、没有后端数据闭环。
- 提供 Mock/API 分离能力，便于后续 UI 并行开发。

### 实现

- 新增 `apps/web/index.html` 和 `apps/web/src/styles.css`。
- 新增 `apps/web/src/shared/api/client.ts`。
  - 封装 `GET /api/v1/health`。
  - 封装 `GET /api/v1/console/dashboard`。
  - 支持注入 `fetch`，用于端到端测试和后续 Mock。
- 新增 `apps/web/src/shared/api/mock.ts`。
  - 提供 typed mock dashboard。
  - 提供 `createMockApiClient()`，接口与真实 API client 一致。
- 新增 `apps/web/src/features/console/dashboard-view-model.ts`。
  - 将 `ConsoleDashboardResponse` 转为首屏运行指标。
- 新增 `apps/web/src/app/navigation.ts` 和 `apps/web/src/app/render.ts`。
  - 导航来源于 `WEB_ROUTES` 契约。
  - 渲染任务、Trace 运行数和待审批列表。
- 新增 `apps/web/dev-server.ts`。
  - 本地开发时服务 `apps/web/index.html`、编译后的 `dist/apps/web/src/main.js` 和 CSS。
  - 将 `/api/*` 请求委托给 `apps/api/src/server.ts` 的 `handleApiRequest()`，用于 F0 本地闭环验证。
- 更新 `package.json`。
  - `dev:web`
  - `dev:api`
  - `build:web`
  - `test:web`
  - `test:e2e`

### 测试验证

- 新增 `tests/web/web-boundary.test.ts`。
  - 验证前端导航来自产品路由契约。
  - 扫描 `apps/web/src`，禁止直接导入后端 `src/*`。
- 新增 `tests/web/dashboard-view-model.test.ts`。
  - 验证 dashboard view-model 能展示任务、待审批和运行 Trace 指标。
- 新增 `tests/e2e/frontend-api.e2e.test.ts`。
  - 通过前端 API client 调用 API gateway 路由处理器。
  - API gateway 再使用后端 Console 聚合 fixture，形成前端 client -> API -> 后端 Console Dashboard 的闭环。
- 验证命令：
  - `npm test`：97 个测试全部通过。
  - `npm run test:web`：3 个测试全部通过。
  - `npm run test:e2e`：1 个测试通过。
  - `npm run build:web`：通过。

### 问题记录

- 原路线图建议 F0 采用 React/Vite/MSW。执行 `npm install react react-dom && npm install -D vite @vitejs/plugin-react @types/react @types/react-dom` 时，沙箱内安装长时间无输出；请求联网安装权限时被系统额度限制拒绝。
- 为避免 F0 前后端闭环停滞，本次采用无第三方依赖的 DOM/TypeScript 前端骨架，保留同样的契约、API client、view-model 和测试边界。后续额度恢复后，可在 `apps/web/src/app/render.ts` 边界内替换为 React/Vite 渲染层。
- 执行 `npm run dev:web` 时，沙箱拒绝监听 `127.0.0.1:5173`，错误为 `listen EPERM`。请求本地启动权限同样被系统额度限制拒绝。因此本次无法在当前环境完成真实端口启动验证，但已经通过 `build:web`、`test:web` 和 `test:e2e` 验证编译、前端边界和前后端数据闭环。
