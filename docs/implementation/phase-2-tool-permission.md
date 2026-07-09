# 阶段 2 实现文档：工具与权限闭环

## 1. 阶段目标

阶段 2 的目标是把阶段 1 的「能调用工具」升级为「能安全调用工具」：

- 工具必须有统一契约和运行时元数据。
- Runtime 必须通过 Tool Registry 查找工具。
- 写文件必须满足先读后写约束。
- 命令执行默认需要审批。
- 权限模式必须进入工具执行路径。
- 审批请求、审批结果必须进入事件流和记录存储。
- 大工具输出不能直接塞入下一轮模型上下文。
- 被禁用工具不能注入，也不能执行。

本阶段仍不实现真实 UI、数据库、沙箱隔离、MCP 接入和团队级策略中心。这些能力属于阶段 3 到阶段 6。

## 2. 已完成能力

### 2.1 ToolContract 与 ToolRegistry

新增 / 修改：

- `src/tools/types.ts`
- `src/tools/registry.ts`
- `tests/tools/registry.test.ts`

核心类型：

- `ToolContract`
- `ToolSource`
- `ToolPermission`
- `ToolConcurrency`
- `JsonSchema`

工具元数据覆盖：

- 工具来源：`builtin`、`mcp`、`plugin`、`skill`
- 输入 Schema
- 是否只读
- 是否有破坏性
- 默认权限：`auto`、`ask`、`deny`
- 并发安全声明
- 输出大小限制
- 超时时间

设计说明：

- Tool Registry 是 Runtime 的唯一工具查找入口。
- 禁用工具会在 `list()` 和 `get()` 两层同时过滤。
- 重名启用工具会直接报错，避免模型看到不确定工具。

### 2.2 Runtime 迁移到 Tool Registry

修改：

- `src/runtime/agent-loop.ts`
- `src/cli/run-cli.ts`
- `tests/runtime/agent-loop.test.ts`

能力：

- `runAgent` 不再接收工具数组，而是接收 `ToolRegistry`。
- 工具执行前通过 `tools.get(name)` 做执行层二次校验。
- 被禁用工具即使被模型伪造调用，也会被视为未知工具并失败。

设计说明：

- 禁用配置不能只影响提示词注入，也必须影响执行层。
- 这为后续 MCP、插件和 Skill 工具分层加载留出了统一入口。

### 2.3 写文件工具与先读后写约束

修改：

- `src/tools/builtin-tools.ts`
- `src/tools/types.ts`
- `tests/tools/builtin-tools.test.ts`

新增工具：

- `write_file`

能力：

- 写入 UTF-8 文本文件。
- 目标路径必须在 workspace 内。
- 写入前必须通过 `read_file` 记录过同一路径。
- 新文件创建也必须先读一次并确认缺失。

设计说明：

- `ToolFacts` 在单次 run 内记录已读文件路径。
- `read_file` 即使遇到 `ENOENT`，也会记录被检查过的 workspace 相对路径。
- `write_file` 拒绝未读目标，减少模型直接覆盖文件的风险。

### 2.4 命令执行工具

修改：

- `src/tools/builtin-tools.ts`
- `tests/tools/builtin-tools.test.ts`

新增工具：

- `run_command`

能力：

- 使用 Node.js `spawn` 执行命令。
- 不通过 shell 执行。
- 默认工作目录是 workspace root。
- 可传入 workspace 相对 `cwd`。
- `cwd` 不能逃出 workspace。
- 输出包含 `exitCode`、`signal`、`stdout`、`stderr`。
- 默认权限为 `ask`。

设计说明：

- 阶段 2 不做完整沙箱，只做最小执行边界。
- 命令执行仍然是高风险能力，因此默认必须走审批。
- 后续阶段应把 `run_command` 接到 Docker、Firecracker、系统沙箱或远程执行器。

### 2.5 权限决策引擎

新增：

- `src/permissions/types.ts`
- `src/permissions/permission-engine.ts`
- `tests/permissions/permission-engine.test.ts`

权限模式：

- `read_only`
- `default`
- `accept_edits`
- `auto`

决策规则：

- 工具级 `deny` 永远优先。
- `read_only` 只允许只读工具。
- `default` 对 `ask` 工具发起审批。
- `accept_edits` 自动允许 `write_file`，但 `run_command` 仍需审批。
- `auto` 允许所有非 deny 工具。

设计说明：

- 权限引擎只做语义决策，不直接执行工具。
- Runtime 负责把决策转换为事件、审批和执行控制。

### 2.6 Runtime 权限审批接入

新增 / 修改：

- `src/core/events.ts`
- `src/permissions/approval-store.ts`
- `src/permissions/types.ts`
- `src/runtime/agent-loop.ts`
- `tests/runtime/agent-loop.test.ts`

新增事件：

- `permission.requested`
- `permission.resolved`

新增接口：

- `ApprovalHandler`
- `ApprovalStore`
- `createMemoryApprovalStore`

能力：

- 工具执行前调用 `decideToolPermission`。
- policy deny 时，工具不会执行。
- ask 决策会发送 `permission.requested`。
- 有审批处理器时，根据审批结果继续或失败。
- 无审批处理器时，默认拒绝并发送 `permission.resolved`。
- 审批结果会记录到 `ApprovalStore`。

设计说明：

- 事件流是 UI、Trace 和 Replay 的共同事实来源。
- 当前实现提供内存审批存储，适合单进程测试和 MVP。
- Durable 审批审计需要在任务服务和数据库落地后实现。

### 2.7 大工具输出引用

新增 / 修改：

- `src/runtime/tool-output-store.ts`
- `src/core/events.ts`
- `src/runtime/agent-loop.ts`
- `tests/runtime/agent-loop.test.ts`

新增接口：

- `ToolOutputStore`
- `createMemoryToolOutputStore`

能力：

- 工具输出超过 `ToolContract.outputLimitBytes` 时写入输出存储。
- `tool.completed` 事件带 `outputRef` 和 `truncated`。
- 下一轮模型消息只收到引用提示，不直接收到完整大结果。
- 内存存储使用稳定引用格式：`tool-output://<runId>/<callId>`。

设计说明：

- 这避免大工具结果直接挤爆模型上下文。
- 当前只实现内存存储；后续应替换为文件、对象存储或任务产物表。

## 3. 测试与验证

### 3.1 自动化测试

命令：

```bash
npm test
```

最后一次验证结果：

```text
tests 33
pass 33
fail 0
```

覆盖范围：

- Tool Registry 启用、禁用和重名检测。
- 内置工具元数据。
- 读文件、列文件、搜索文本。
- 先读后写。
- 新文件创建前缺失确认。
- 命令执行和 workspace cwd 限制。
- 权限模式决策。
- Runtime 审批请求、审批结果记录和拒绝执行。
- 大工具输出引用。
- CLI 基础链路。

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

阶段 2 相关提交：

- `3624cb8 feat: add tool contract registry`
- `8aafd1a feat: migrate runtime to tool registry`
- `1095b90 feat: add guarded write file tool`
- `be06be6 feat: add permission decision engine`
- `40ee3c3 feat: add guarded command tool`
- `4f5ed5f feat: enforce runtime permissions`
- `c44b3d1 feat: store oversized tool output`

## 5. 实施中遇到的问题

### 5.1 npm test 传单个 TypeScript 文件参数会误跑源码路径

现象：

- 执行 `npm test -- tests/tools/builtin-tools.test.ts` 时，脚本仍会先构建并运行 `dist/tests/**/*.test.js`。
- 额外传入的 TypeScript 文件会被 Node 直接执行，导致 `.js` import 路径无法解析。

处理：

- 后续验证统一使用 `npm test` 跑完整测试集。
- 如果需要单测粒度，应新增独立脚本，例如只运行 `dist/tests/tools/builtin-tools.test.js`。

### 5.2 run_command 初次实现有对象闭合语法错误

现象：

- 新增 `run_command` 时，把普通工具对象误写成 `})` 结尾，TypeScript 报 `TS1005: ',' expected`。

处理：

- 修正为普通对象闭合 `}`。
- 重新运行 `npm test`，确认工具测试通过。

### 5.3 审批和输出存储当前是内存实现

限制：

- `createMemoryApprovalStore` 和 `createMemoryToolOutputStore` 适合测试和单进程 MVP。
- 进程退出后记录会丢失。
- 还不能跨任务查询、审计或在 UI 中长期回放。

后续思路：

- 阶段 3 或阶段 4 引入任务服务和 Trace Store 后，将审批记录和工具输出引用落到数据库或对象存储。
- Runtime 继续依赖接口，不绑定具体存储实现。

## 6. 阶段 2 完成情况

对照路线图验收标准：

- 写文件前如果未读取目标文件，工具会拒绝执行：已完成。
- 命令执行默认进入审批：已完成。
- 用户审批结果被记录并可查询：已完成内存版。
- 被禁用工具不会被注入，也不会在执行层执行：已完成。
- 大工具结果不会直接塞爆上下文：已完成内存引用版。

阶段 2 已形成最小工具与权限闭环。生产级持久化、沙箱隔离和团队级策略治理留到后续阶段继续建设。
