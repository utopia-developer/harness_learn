# 前端 F1：设计系统与 App Shell 实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F1 范围推进：沉淀设计 token、基础组件模型、状态组件和共享 App Shell，使后续 Task Center、Approval Queue、Release Readiness 等页面都复用同一套导航、布局和状态语义。

## 功能点 1：设计 Token 与基础组件模型

### 目标

- 将 Figma 视觉系统先固化为可测试的前端设计契约。
- 为后续页面提供统一的颜色、状态、间距、圆角、字体和焦点样式。
- 让 Button、Badge、Card、Table、MetricCard、ProgressBar、CodeBlock、Empty、Loading、Error、PermissionRiskBadge 在进入真实 UI 框架前就具备稳定 view-model。

### 实现

- 新增 `apps/web/src/design-system/tokens.ts`。
  - 定义 surface、text、border、status 语义色。
  - 定义 spacing、radius、font 和 focus ring token。
- 新增 `apps/web/src/design-system/components.ts`。
  - 提供基础组件和状态组件 view-model 工厂。
  - Button 默认带 `ariaLabel`、`tabIndex` 和 disabled 焦点约束。
  - Table column 默认带 `scope: "col"`。
  - ProgressBar 将输入值限制在 `0-100`。
  - PermissionRiskBadge 将 low、medium、high 映射到 success、warning、danger。
- 新增 `apps/web/src/design-system/index.ts` 统一导出。

### 测试验证

- 新增 `tests/web/design-system.test.ts`。
- 验证 token、基础组件可访问性元数据、表格结构和权限风险语义。
- 验证命令：`npm run test:web`。
- 当前结果：6 个 web 测试全部通过。

### 问题记录

- 当前仍使用无第三方依赖的 TypeScript view-model 方式沉淀组件契约，未引入 React 组件库。原因与 F0 一致：本环境此前无法联网安装 React/Vite 依赖。
- 设计 token 先采用 Figma 设计语义的工程映射，后续如需像素级同步，应补充 Figma token 导出或 Style Dictionary 生成链路。

## 功能点 2：共享 App Shell 与 5 个核心页面导航

### 目标

- F1 验收要求 5 个核心页面共享同一套导航与布局。
- App Shell 需要能根据当前路径识别页面上下文，输出统一的 Sidebar、Topbar 和主内容区可访问性信息。
- 旧的 F0 导航常量需要改为复用同一份页面注册表，避免后续页面新增时导航分叉。

### 实现

- 新增 `apps/web/src/app/shell.ts`。
  - 定义 `APP_PAGES`，覆盖：
    - `/tasks`
    - `/approvals`
    - `/releases/current`
    - `/settings/policy`
    - `/settings/plugins`
  - 新增 `createAppShellViewModel(pathname)`。
  - 输出 brand、currentPage、navigation、topbar 和 `mainRegionAriaLabel`。
  - 当前页面的导航项带 `active: true` 和 `ariaCurrent: "page"`。
- 更新 `apps/web/src/app/navigation.ts`。
  - `WEB_NAVIGATION` 改为从 `APP_PAGES` 派生。
- 更新 `tests/web/web-boundary.test.ts`。
  - F0 的 4 页面导航验收升级为 F1 的 5 页面导航验收。

### 测试验证

- 新增 `tests/web/app-shell.test.ts`。
- 覆盖 5 个核心页面注册、共享导航、active 状态、Topbar 标题描述和主内容区 aria label。
- 验证命令：`npm run test:web`。
- 当前结果：8 个 web 测试全部通过。

### 问题记录

- 实现时 TypeScript 将 `createAppShellViewModel(pathname = WEB_ROUTES.tasks)` 的参数推断为字面量 `"/tasks"`，导致测试传入 `/approvals` 和 `/settings/plugins` 时类型失败。
- 处理方式：显式声明 `pathname: string = WEB_ROUTES.tasks`，让 Shell 支持真实路由输入。
