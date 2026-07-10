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

## 功能点 2：前端 Governance API Client、Mock 与 View-model

### 目标

- 前端通过 typed API client 调用 F6 endpoints。
- Mock client 提供同形状 policy 和 plugin 数据，保证无后端时也能渲染 F6 页面。
- Policy view-model 统一处理项目策略、工具/模型白名单和模拟结果。
- Plugins view-model 统一处理插件安装/启用状态、操作入口和 shared skills。

### 实现

- 更新 `apps/web/src/shared/api/client.ts`。
  - 新增 `getProjectPolicy(projectId)`。
  - 新增 `updateProjectPolicy(projectId, input)`。
  - 新增 `simulateProjectPolicy(projectId, input)`。
  - 新增 `listTeamPlugins(teamId)`。
  - 新增 `installTeamPlugin(teamId, pluginId)`。
  - 新增 `enableTeamPlugin(teamId, pluginId)`。
  - 新增 `disableTeamPlugin(teamId, pluginId)`。
  - 新增 `putJson()` 支持策略更新。
- 更新 `apps/web/src/shared/api/mock.ts`。
  - mock client 同步补齐 F6 方法。
  - 提供 `project-harness` 策略、插件 catalog 和 shared skills 数据。
- 新增 `apps/web/src/features/settings/policy-view-model.ts`。
  - 输出项目名称、teamId、工具/模型白名单状态、策略更新 action、模拟 action 和模拟决策展示。
- 新增 `apps/web/src/features/settings/plugins-view-model.ts`。
  - 输出插件列表、状态、主操作和团队 shared skills。

### 测试验证

- 新增 `tests/web/api-client-governance.test.ts`。
  - 验证 policy/plugin API 路径、HTTP 方法和 PUT body。
- 新增 `tests/web/policy-view-model.test.ts`。
  - 验证工具/模型白名单、策略 action 和模拟结果。
- 新增 `tests/web/plugins-view-model.test.ts`。
  - 验证插件安装/启用状态、主操作和 shared skills。
- 验证命令：`npm run test:web`。
- 当前结果：32 个 web 测试全部通过。

### 问题记录

- F6 扩展 `ApiClient` 后，mock client 必须同步补齐治理方法，否则 `createMockApiClient()` 不满足接口。
- 处理方式：mock 数据复用真实契约 DTO，保持真实 API 与 mock API 接口一致。

## 功能点 3：Policy / Plugins 页面渲染与 e2e

### 目标

- `/settings/policy` 页面实际渲染项目策略，而不是只显示导航。
- 页面展示模型白名单、工具白名单、保存策略表单和策略模拟器。
- `/settings/plugins` 页面展示插件列表、安装/启用/禁用操作和 Team shared skills。
- 页面操作通过前端 API client 调用真实 API，并刷新页面数据。
- e2e 验证策略更新、策略模拟、插件安装和插件启用闭环。

### 实现

- 更新 `apps/web/src/app/render.ts`。
  - `/settings/policy` 路径调用 `client.getProjectPolicy("project-harness")`。
  - `/settings/plugins` 路径调用 `client.listTeamPlugins("team-platform")`。
  - `renderAppHtml()` 支持 `policySettings` 和 `pluginsSettings` 输入。
  - 新增 Policy 页面内容渲染：
    - 已允许工具数量。
    - 已允许模型数量。
    - 工具白名单 checkbox。
    - 模型白名单 checkbox。
    - 策略保存表单。
    - 策略模拟器。
    - 模拟决策结果。
  - 新增 Plugins 页面内容渲染：
    - 插件数量。
    - 已启用数量。
    - shared skills 数量。
    - 插件卡片。
    - 安装 / 启用 / 禁用表单。
    - Team shared skills 列表。
  - 新增 `bindPolicyForms()` 和 `bindPluginForms()`，操作完成后刷新对应页面数据。
- 更新 `apps/web/src/styles.css`。
  - 增加 settings 布局、白名单选项、策略模拟结果、插件卡片和 shared skills 样式。

### 测试验证

- 新增 `tests/web/settings-render.test.ts`。
  - 覆盖 Policy 页面白名单、策略模拟 action 和模拟结果。
  - 覆盖 Plugins 页面插件状态、操作 action 和 shared skills。
- 更新 `tests/e2e/frontend-api.e2e.test.ts`。
  - e2e 验证读取策略、模拟策略、更新策略、安装插件、启用插件、渲染 Policy / Plugins 页面。
- 验证命令：
  - `npm run test:web`：34 个 web 测试全部通过。
  - `npm run test:e2e`：6 个端到端测试全部通过。

### 问题记录

- 当前 F6 MVP 使用 seed 上下文 `project-harness` 与 `team-platform`，页面还没有项目/team 切换器。
- 处理方式：先闭合单项目单团队治理链路，后续在 Auth / RBAC / 项目选择能力进入 F8 后再参数化。
