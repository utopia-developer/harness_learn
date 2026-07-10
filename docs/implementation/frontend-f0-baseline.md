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
