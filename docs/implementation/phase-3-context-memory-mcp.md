# 阶段 3 实现文档：上下文、记忆与 MCP 适配闭环

## 1. 阶段目标

阶段 3 的目标是让 Harness 支持更长任务和外部工具生态：

- 引入 Context Manager，避免简单滑窗丢失任务锚点。
- 提供轻量 token 估算。
- 支持分层上下文压缩。
- 支持大工具结果按引用重新读取。
- 提供基础记忆表，并确保任务结束后才写入长期记忆。
- 提供 MCP 工具适配层，做到懒连接、失败隔离和保守权限。

本阶段仍不引入真实数据库、pgvector、外部 MCP SDK 和远程 MCP server。原因是当前项目仍处于本地 Runtime MVP，优先保证 Harness 内部契约、治理语义和测试闭环稳定。后续可以用 pgvector 和官方 MCP SDK 替换当前内存实现与抽象适配层。

## 2. 已完成能力

### 2.1 Context Manager 与 token 估算

新增：

- `src/context/context-manager.ts`
- `tests/context/context-manager.test.ts`

核心类型：

- `ContextItem`
- `ContextItemKind`
- `CompactContextInput`
- `CompactContextResult`

Context 分层：

- `user_goal`
- `system_constraint`
- `task_state`
- `tool_fact`
- `compressible_history`
- `discardable`
- `summary`

能力：

- `estimateTokens()` 提供确定性的轻量 token 估算。
- `compactContext()` 在预算内保留高优先级上下文。
- 用户目标、系统约束、任务状态和工具事实属于受保护上下文。
- 可压缩历史会被汇总为 `summary`。
- 可丢弃冗余会进入 `droppedItemIds`。

设计说明：

- 阶段 3 不直接引入 `tiktoken`，避免新增网络依赖和模型绑定。
- 当前估算函数是可替换实现，后续可以通过同一接口接入 `tiktoken`。
- 压缩策略优先保护任务锚点，避免长任务中用户目标被滑窗淘汰。

### 2.2 工具输出引用读取

修改：

- `src/runtime/tool-output-store.ts`
- `src/tools/types.ts`
- `src/runtime/agent-loop.ts`
- `src/tools/builtin-tools.ts`
- `tests/runtime/agent-loop.test.ts`
- `tests/tools/builtin-tools.test.ts`

新增工具：

- `read_tool_output`

能力：

- `ToolOutputStore` 支持 `put()` 和 `get()`。
- `runAgent` 会把当前 run 的 `outputStore` 传入工具执行上下文。
- `read_tool_output` 可通过 `tool-output://<runId>/<callId>` 读取完整输出内容。
- 读取工具是只读工具，默认 `auto` 权限。

设计说明：

- 阶段 2 已实现大输出转引用；阶段 3 补齐了引用可读回的闭环。
- 当前实现使用内存存储，后续可以替换为文件、对象存储或任务产物表。

### 2.3 基础记忆系统

新增 / 修改：

- `src/memory/memory-store.ts`
- `tests/memory/memory-store.test.ts`
- `src/runtime/agent-loop.ts`
- `tests/runtime/agent-loop.test.ts`

核心类型：

- `MemoryRecord`
- `MemoryStore`
- `createMemoryStore`
- `createTaskSummaryMemory`

能力：

- 支持内存记忆追加和查询。
- 记忆记录不可被外部 list 结果直接篡改。
- `runAgent` 在 `agent.completed` 时写入任务摘要记忆。
- 失败、取消和未知工具路径不会写入长期记忆。

设计说明：

- 长期记忆只在任务完成后写入，避免当前对话内容在执行中自我强化。
- 当前只记录 `task_summary`，内容包括用户目标和最终输出。
- 后续接入数据库后，可以增加向量字段、来源、标签、质量分和过期策略。

### 2.4 MCP 工具适配层

新增：

- `src/mcp/mcp-tool-adapter.ts`
- `tests/mcp/mcp-tool-adapter.test.ts`

核心类型：

- `McpServerDefinition`
- `McpToolDeclaration`
- `McpClient`
- `McpConnect`
- `createMcpToolContracts`

能力：

- 根据 MCP server 声明导入工具契约。
- 工具命名格式：`mcp.<server>.<tool>`。
- 导入阶段不连接 MCP server。
- 工具执行时才懒连接 server。
- 同一 server 连接会复用。
- server 连接失败不影响 Tool Registry 创建。
- MCP 工具默认：
  - `source: "mcp"`
  - `permission: "ask"`
  - `readOnly: false`
  - `destructive: true`
  - `concurrency: "exclusive"`

设计说明：

- 官方 MCP SDK 解决协议调用，但不解决 Harness 需要的权限、安全、懒连接、工具命名和禁用治理。
- 因此本阶段先建立内部治理适配层。
- 后续可把 `McpConnect` 的实现替换为官方 MCP SDK client。

## 3. 测试与验证

### 3.1 自动化测试

命令：

```bash
npm test
```

最后一次验证结果：

```text
tests 42
pass 42
fail 0
```

覆盖范围：

- token 估算。
- 上下文压缩保留用户目标和系统约束。
- 工具输出引用重新读取。
- 任务完成后写入记忆。
- 失败路径不写入记忆。
- MCP 工具导入不触发连接。
- MCP 工具执行时懒连接并复用连接。
- MCP server 连接失败不影响 Registry 创建。
- 阶段 1、阶段 2 原有 Runtime、权限和工具测试回归。

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

阶段 3 相关提交：

- `4caa82d feat: add context compaction manager`
- `7d4ff1d feat: add tool output reference reader`
- `31cd178 feat: add task memory store`
- `3c9eb14 feat: add lazy MCP tool adapter`

## 5. 实施中遇到的问题

### 5.1 token 估算第一次实现过于乐观

现象：

- `estimateTokens("hello")` 初次返回 1，不符合测试中对纯英文短文本的保守估算预期。

处理：

- 对纯英文 token 增加基础 overhead。
- 保持中英文混合文本不重复增加 overhead。

### 5.2 新增内置工具时再次出现闭合符号错误

现象：

- 新增 `read_tool_output` 时，`withReadOnlyMetadata()` 调用少了一个 `)`，TypeScript 报 `TS1005: ',' expected`。

处理：

- 修正调用闭合。
- 重新运行 `npm test`，确认完整测试通过。

### 5.3 ToolOutputStore.get 需要支持异步实现

现象：

- 扩展 `ToolOutputStore.get()` 后，旧测试按同步方式读取 `.content`，TypeScript 提示可能是 Promise。

处理：

- 测试统一使用 `await outputStore.get(ref)`。
- 保留接口异步能力，便于后续替换为文件系统、对象存储或数据库。

### 5.4 未接入 pgvector 和官方 MCP SDK

原因：

- 当前阶段目标是内部设计闭环，不是外部依赖集成。
- 引入真实 pgvector 需要数据库服务、迁移和连接配置。
- 引入官方 MCP SDK 需要网络安装依赖，并会把阶段 3 的风险从 Harness 契约转移到外部协议细节。

后续思路：

- 保留 `MemoryStore` 接口，后续新增 `PgVectorMemoryStore`。
- 保留 `McpConnect` 接口，后续新增基于官方 MCP SDK 的 connector。
- Tool Registry 和 Permission Engine 不需要因为底层实现替换而改变。

## 6. 阶段 3 完成情况

对照路线图验收标准：

- 长对话触发压缩后仍保留用户目标：已完成。
- 大结果可以按引用重新读取：已完成。
- 任务结束后才写入长期记忆：已完成。
- MCP server 连接失败不影响主程序启动：已完成。
- MCP 工具默认需要保守权限：已完成。

阶段 3 已形成上下文、记忆和 MCP 适配的最小闭环。后续阶段可继续把内存实现替换为持久化存储，并把 MCP 抽象接到真实 SDK 与外部 server。
