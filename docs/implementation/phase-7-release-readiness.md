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

## 功能点 3：发布就绪报告

### 目标

- 将发布准入 Gate 的结果沉淀为一份可归档、可审计、可展示的发布报告。
- 报告必须包含发布状态、阻塞原因、检查明细和证据引用。
- 审计证据按项目过滤，避免跨项目事件泄漏到当前发布报告。

### 实现

- 新增 `src/release/readiness-report.ts`。
- `createReleaseReadinessReport` 接收 `ReleaseGateResult`、`AuditLog`、`traceIds` 和发布元数据。
- 当 Gate 通过时输出 `status: "ready"`；失败时输出 `status: "blocked"` 并生成 `blockers`。
- `evidence` 中包含：
  - 当前项目审计事件数量。
  - 当前项目审计事件 JSONL。
  - 关联 trace id 列表。
- 若报告项目与 Gate 项目不一致，直接抛错，避免错误归档。

### 测试验证

- 新增 `tests/release/readiness-report.test.ts`。
- 覆盖 ready 报告、blocked 报告、项目级审计事件过滤。
- 验证命令：`npm test`。
- 当前结果：79 个测试全部通过。

### 问题记录

- TDD 红灯阶段出现预期内的 `readiness-report` 模块缺失错误。
- 当前报告层没有引入外部存储，证据归档先以纯对象和 JSONL 字符串表达，便于后续接入文件、数据库或 CI artifact。

## 阶段 7 闭环

- 项目策略通过 `createProjectScopedToolRegistry` 和 `assertProjectModelAllowed` 进入运行前装配。
- 评测、成本、质量通过 `runReleaseGate` 形成发布准入判断。
- 发布准入判断与审计、trace 证据通过 `createReleaseReadinessReport` 形成可归档报告。
