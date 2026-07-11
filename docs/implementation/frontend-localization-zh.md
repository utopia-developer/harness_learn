# 前端主体文案中文化实现记录

## 背景

用户验证前端页面时发现页面可以正常显示，但主体内容仍有较多英文文案。此次修复目标是：除 Harness、Agent、Trace、Replay Case、Plugin、Skill、Eval、Gate、JSONL、Tool、Model 等产品或技术专有名词外，页面主体文案、状态、按钮、表头、空状态、API 返回的演示业务说明均以简体中文为主。

## 实现范围

- 页面模板：任务中心、运行详情、审批队列、发布就绪、团队策略、插件注册表、指标分析的标题、指标卡、表头、按钮、详情字段和空状态文案。
- ViewModel 标签：任务状态、Release Gate 状态、审批风险等级、审批动作、插件状态与动作、策略模拟决策、运行状态、质量/运行指标状态、会话角色与只读提示。
- 后端/Mock 演示数据：审批原因、风险说明、策略建议、发布就绪摘要、Gate 检查详情、阻塞原因、权限错误提示、Eval 失败原因。
- 测试断言：同步更新 web render/view-model 测试、E2E 测试、release/eval/API 相关测试，确保中文文案成为回归约束。

## 验证

- `npm run test:web`
  - 结果：43 项通过，0 失败。
- `npm test`
  - 结果：175 项通过，0 失败。
- 本地服务验证：
  - 已重启 `npm run dev:web`。
  - 服务地址：`http://127.0.0.1:5173`。
  - 抽样 API：
    - `/api/v1/approvals?status=pending` 返回中文审批原因、风险说明和规则建议。
    - `/api/v1/releases/release-console-dogfood/readiness` 返回中文发布摘要、检查详情和阻塞原因。

## 问题记录

- 直接 `curl` 页面路由只能拿到客户端渲染壳 HTML，无法验证最终 DOM 文案；因此用编译产物扫描、自动化 render/E2E 测试和 API 抽样共同验证。
- 首轮只改前端模板后，发现后端 release gate 与 approval seed 仍会把英文业务说明流入页面；已将这些源头文案同步中文化，避免页面刷新或交互后重新出现英文主体内容。
- 机器可读字段仍保留英文，例如 `status`、`error`、`actionKind`、路由和工具/模型标识，避免破坏 API 契约。

## 后续修复：发布 Tab 404

用户继续验证时发现点击发布 Tab 会显示 404。根因是导航链接使用 `/releases/current` 表示“当前发布”，但前端渲染逻辑将 `current` 当作真实 release id 请求 `/api/v1/releases/current/readiness`，后端没有该 release，因此返回 404。

修复方式：

- 在前端 release 路由解析中将 `current` 视为占位符，回落到 release 列表第一条真实 release id。
- 增加回归测试，验证 `/releases/current` 会请求 `release-console-dogfood`，不会请求 `current`。
- 保留后端 `/api/v1/releases/current/readiness` 返回 404 的语义，因为 `current` 不是 API 契约中的真实 id。

验证：

- `npm run test:web`：44 项通过，0 失败。
- `npm test`：176 项通过，0 失败。
