# 阶段 7：集成硬化与发布就绪实现记录

> 说明：原实施路线图截至阶段 6。阶段 7 作为补充收口阶段，目标是把前 6 阶段形成的团队策略、插件、成本质量、审计、评测能力串成可 dogfood、可发布、可验收的闭环。

## 功能点 1：项目级 Runtime 策略装配

### 目标

- 将团队项目策略中的 `allowedTools` 转换为实际可执行的项目级工具注册表。
- 在模型进入 Runtime 前执行项目级模型准入检查。
- 保持策略中心与 Runtime 解耦，避免把团队治理逻辑侵入 `runAgent` 主循环。

### 实现

- 新增 `src/release/project-runtime.ts`。
- `createProjectScopedToolRegistry` 根据 `TeamPolicyCenter.canUseTool` 过滤工具，并复用现有 `createToolRegistry` 保持重复工具名等基础校验行为一致。
- `assertProjectModelAllowed` 根据 `TeamPolicyCenter.canUseModel` 做模型白名单校验，未通过时抛出明确错误。

### 测试验证

- 新增 `tests/release/project-runtime.test.ts`。
- 覆盖项目策略过滤工具、允许白名单模型、拒绝非白名单模型三类场景。
- 验证命令：`npm test`。
- 当前结果：75 个测试全部通过。

### 问题记录

- TDD 红灯阶段出现预期内的 `project-runtime` 模块缺失错误。
- 新模块补齐后未引入额外依赖，未修改 Runtime 主循环，避免扩大变更面。

## 功能点 2：发布准入 Gate

### 目标

- 将回放评测、成本预算、质量趋势统一成发布前的机器可判定结果。
- 对失败发布给出明确阻塞原因，便于后续报告、CI 或人工审批直接消费。
- Gate 本身不执行测试、不采集指标，只负责组合已有模块输出并生成判定。

### 实现

- 新增 `src/release/release-gate.ts`。
- `runReleaseGate` 接收 `EvalGateResult`、`CostSummary`、`QualityTrend` 和阈值配置。
- 输出 `ReleaseGateResult`，包含整体 `passed` 状态，以及 `eval`、`cost`、`quality` 三类检查详情。
- 支持阈值：
  - `maxCostUsd`
  - `minQualityPassRate`
  - `minAverageQualityScore`
  - `minQualityRuns`

### 测试验证

- 新增 `tests/release/release-gate.test.ts`。
- 覆盖全部通过和多项阻塞两类场景。
- 验证命令：`npm test`。
- 当前结果：77 个测试全部通过。

### 问题记录

- TDD 红灯阶段出现预期内的 `release-gate` 模块缺失错误。
- 当前实现保持为纯函数，便于后续接入 CLI、CI 或服务端 API。
