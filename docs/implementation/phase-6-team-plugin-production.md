# 阶段 6 实现文档：团队化、插件化与生产化

## 1. 阶段目标

阶段 6 的目标是将 Harness 从单用户工具升级为团队级平台：

- 支持团队、项目、用户角色和项目级策略。
- 支持插件注册、安装、启用和禁用。
- 支持团队共享插件中的 Skill。
- 支持按项目查看模型、工具和 Skill 的成本归因。
- 支持质量趋势面板数据。
- 支持基础 worker pool。
- 支持基础 sandbox pool。
- 支持企业审计日志导出。

本阶段仍不直接接入 OPA、Casbin、BullMQ、Temporal、Prometheus、Grafana、E2B、Daytona、gVisor 或 Firecracker。当前优先稳定 Harness 内部产品闭环和接口，后续可以把这些开源组件作为替换实现或 exporter 接入。

## 2. 已完成能力

### 2.1 Team / Project / Policy Center

新增：

- `src/team/team-policy.ts`
- `tests/team/team-policy.test.ts`

核心类型：

- `Team`
- `TeamRole`
- `TeamMember`
- `Project`
- `ProjectPolicy`
- `TeamPolicyCenter`
- `createTeamPolicyCenter`

能力：

- 创建团队。
- 添加团队成员。
- 检查用户角色。
- 创建项目。
- 为项目设置允许工具列表。
- 为项目设置允许模型列表。
- 更新项目级策略。
- 检查项目是否允许使用某个工具或模型。
- 不同项目策略互相独立。

设计说明：

- 当前实现是内存 Policy Center。
- 项目级策略先覆盖工具和模型，满足阶段 6 的管理员限制能力。
- 后续可接入 OPA 或 Casbin，但 Runtime 侧仍应调用 Harness 的策略接口，而不是直接依赖具体规则引擎。

### 2.2 Plugin Registry 与团队 Skill 共享

新增：

- `src/plugins/plugin-registry.ts`
- `tests/plugins/plugin-registry.test.ts`

核心类型：

- `PluginManifest`
- `PluginRegistry`
- `createPluginRegistry`

Manifest 字段：

- `id`
- `name`
- `version`
- `tools`
- `skills`

能力：

- 安装插件 manifest。
- 查询插件 manifest。
- 为团队启用插件。
- 为团队禁用插件。
- 查询团队已启用插件。
- 查询团队可共享 Skill。
- 禁用插件不会删除 manifest。

设计说明：

- 插件是产品分发与治理单元，不只是工具列表。
- 团队只有启用插件后，才会看到其中的 Skill。
- 后续可增加插件签名、版本升级、兼容性声明和 marketplace 元数据。

### 2.3 Cost / Quality Dashboard Model

新增：

- `src/metrics/cost-quality.ts`
- `tests/metrics/cost-quality.test.ts`

核心类型：

- `ModelUsageRecord`
- `ToolUsageRecord`
- `CostSummary`
- `QualityResultRecord`
- `QualityTrend`
- `CostQualityDashboard`
- `createCostQualityDashboard`

成本能力：

- 记录模型调用成本。
- 记录工具调用成本。
- 按项目聚合总成本。
- 按模型聚合成本。
- 按工具聚合成本。
- 按 Skill 聚合成本。

质量能力：

- 记录 Eval / release gate 结果。
- 计算项目总运行次数。
- 计算通过率。
- 计算平均分。
- 按时间排序输出趋势点。

设计说明：

- 当前实现是面板数据模型，不直接渲染 UI。
- Prometheus / Grafana 更适合指标采集和展示，但 Harness 需要先定义按任务、模型、工具、Skill 归因的数据口径。
- 后续可把这些记录导出到 Prometheus、ClickHouse 或数据仓库。

### 2.4 Worker Pool / Sandbox Pool / Audit Log

新增：

- `src/ops/runtime-ops.ts`
- `tests/ops/runtime-ops.test.ts`

核心类型：

- `WorkerPool`
- `createWorkerPool`
- `SandboxInstance`
- `SandboxLease`
- `SandboxPool`
- `createSandboxPool`
- `AuditEvent`
- `AuditLog`
- `createAuditLog`

Worker 能力：

- 支持任务入队。
- 支持并发上限。
- 返回每个任务执行结果。

Sandbox 能力：

- 支持从池中租用 sandbox。
- 租约绑定 `taskId`。
- 支持释放 sandbox。
- 支持查看可用 sandbox 数量。

审计能力：

- 记录审计事件。
- 查询审计事件。
- 导出 JSONL。

设计说明：

- 当前 worker pool 是本地内存队列，不替代 BullMQ 或 Temporal。
- 当前 sandbox pool 是抽象租约模型，不提供 OS / VM 级隔离。
- 当前 audit log 是内存实现，后续应落到数据库或对象存储。
- 这些接口先稳定后，才能安全替换为真实生产组件。

## 3. 测试与验证

### 3.1 自动化测试

命令：

```bash
npm test
```

最后一次验证结果：

```text
tests 72
pass 72
fail 0
```

覆盖范围：

- 团队成员和角色检查。
- 项目级工具策略。
- 项目级模型策略。
- 项目策略隔离。
- 插件安装、启用和禁用。
- 团队共享插件 Skill。
- 模型成本统计。
- 工具成本统计。
- Skill 成本归因。
- 质量趋势计算。
- worker pool 并发控制。
- sandbox pool 租约和释放。
- 审计日志 JSONL 导出。
- 阶段 1 到阶段 5 原有 Runtime、权限、上下文、安全、Trace、Skill、SubAgent 和 Eval 测试回归。

### 3.2 构建验证

`npm test` 内部已执行：

```bash
npm run build
```

结果：

```text
tsc -p tsconfig.json
exit 0
```

## 4. Git 提交记录

阶段 6 相关提交：

- `ba6d194 feat: add team project policy center`
- `5941e44 feat: add team plugin registry`
- `91d01d9 feat: add cost quality dashboard model`
- `2535299 feat: add runtime ops primitives`

## 5. 实施中遇到的问题

### 5.1 未直接接入 OPA / Casbin

原因：

- 当前阶段需要先稳定 Harness 的项目级策略接口。
- OPA / Casbin 适合做规则求值，但不能替代 Harness 对工具、模型、Skill 和项目的产品语义建模。

后续思路：

- 保留 `TeamPolicyCenter` 接口。
- 新增 OPA / Casbin adapter。
- 策略中心仍输出 Harness 内部的 allow / deny 结果。

### 5.2 未直接接入 BullMQ / Temporal

原因：

- 当前任务执行仍是本地 Runtime MVP。
- 引入队列需要 Redis、worker 部署和失败重试策略。

后续思路：

- 保留 `WorkerPool.enqueue()` 语义。
- 新增 BullMQ 或 Temporal 实现。
- 将任务状态、重试和审计事件统一接入 Task Service。

### 5.3 未直接接入云端 sandbox 池

原因：

- E2B、Daytona、gVisor、Firecracker 都需要外部运行环境。
- 阶段 6 先定义 sandbox 租约和释放模型。

后续思路：

- 保留 `SandboxPool` 接口。
- 新增 E2B / Daytona / Firecracker provider。
- 与阶段 4 的 `SandboxProfile` 做策略映射。

### 5.4 未直接实现可视化 Dashboard

原因：

- 当前仓库还没有 Web Console。
- 先实现 dashboard 数据模型，避免 UI 先行导致数据口径不稳定。

后续思路：

- Web Console 读取 `CostSummary` 和 `QualityTrend`。
- 指标可以同步导出到 Prometheus / Grafana。

## 6. 阶段 6 完成情况

对照路线图验收标准：

- 团队可以共享插件和 Skill：已完成。
- 管理员可以限制某类工具或模型：已完成项目级策略 MVP。
- 每个项目有独立权限策略：已完成。
- 可以查看成本和质量趋势：已完成数据模型。
- 云端任务可以隔离执行：已完成 sandbox pool 租约模型，真实云端 provider 留到后续接入。

阶段 6 已形成团队化、插件化、成本质量和运行运维的最小生产化闭环。后续可以继续把内存实现替换为外部规则引擎、队列系统、云沙箱和观测平台。
