# 前端 F6：Team Policy 与 Plugins 实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F6 范围推进：实现 `/settings/policy` 团队策略界面、模型/工具白名单、策略模拟器、`/settings/plugins` 插件管理、插件安装/启用/禁用和 Team shared skills 可视化，并通过端到端测试确认前端页面消费真实 API 数据。

## 功能点 1：Team Policy 与 Plugin 契约/API Gateway

### 目标

- 补齐 F6 后端依赖 API：
  - `GET /api/v1/projects/:projectId/policy`
  - `PUT /api/v1/projects/:projectId/policy`
  - `POST /api/v1/projects/:projectId/policy/simulate`
  - `GET /api/v1/teams/:teamId/plugins`
  - `POST /api/v1/teams/:teamId/plugins/:pluginId/install`
  - `POST /api/v1/teams/:teamId/plugins/:pluginId/enable`
  - `POST /api/v1/teams/:teamId/plugins/:pluginId/disable`
- 策略 API 返回项目、当前白名单和可选工具/模型。
- 策略模拟器返回工具和模型是否被允许及原因。
- 插件 API 返回安装状态、启用状态和团队 shared skills。

### 实现

- 更新 `packages/contracts/src/index.ts`。
  - 新增 `ProjectPolicyDto`、`ProjectPolicyResponse`、`UpdateProjectPolicyRequest`。
  - 新增 `PolicySimulationRequest`、`PolicySimulationResponse`。
  - 新增 `TeamPluginDto`、`TeamPluginsResponse`、`PluginActionResponse`。
  - 新增 F6 endpoint builder。
- 新增 `apps/api/src/team-governance-store.ts`。
  - 复用现有 `TeamPolicyCenter` 管理项目工具/模型白名单。
  - 复用现有 `PluginRegistry` 管理插件安装、启用、禁用和 shared skills。
  - seed `team-platform` 与 `project-harness`。
  - seed `review-pack` 已安装并启用、`ops-pack` 已安装未启用、`research-pack` 可安装。
- 更新 `apps/api/src/server.ts`。
  - 接入项目策略、策略模拟和团队插件路由。
  - 支持 `PUT` 策略更新请求体解析。

### 测试验证

- 更新 `tests/contracts/contracts.test.ts`。
- 新增 `tests/api/policy-plugin-api.test.ts`。
- 覆盖：
  - F6 endpoint 和 DTO。
  - 项目策略读取与更新。
  - 策略模拟器允许/拒绝原因。
  - 插件列表、安装、启用、禁用。
  - Team shared skills 更新。
- 验证命令：
  - `npm run build`：通过。
  - `node --test dist/tests/contracts/contracts.test.js dist/tests/api/policy-plugin-api.test.js`：8 个测试全部通过。

### 问题记录

- 第一版插件列表测试只预期已安装插件，实际页面需要展示可安装插件入口，因此 API 返回完整 plugin catalog 更符合 F6 产品目标。
- 处理方式：测试调整为验证 3 个插件，并明确 `research-pack` 为未安装状态。
