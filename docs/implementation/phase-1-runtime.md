# 阶段 1 实现文档：最小 Agent Runtime

## 1. 阶段目标

阶段 1 的目标是实现一个最小可运行的 Harness Runtime：

- 能接收用户消息。
- 能调用模型客户端。
- 能流式产生事件。
- 能解析工具调用。
- 能执行内置工具并把结果回写给下一轮模型。
- 能通过最大迭代次数防止无限循环。
- 能响应取消信号。
- 能通过 CLI 入口跑通完整链路。

本阶段不接真实 LLM Provider，也不实现权限审批、MCP、Skill、沙箱和复杂上下文压缩。这些能力留到后续阶段。

## 2. 已完成能力

### 2.1 TypeScript 项目骨架

新增：

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.gitignore`
- `src/index.ts`
- `tests/smoke.test.ts`

技术决策：

- 使用 TypeScript。
- 使用 Node.js 内置 `node:test`，减少早期测试依赖。
- 构建产物输出到 `dist/`，不提交产物。

### 2.2 AgentEvent 与 RunState

新增：

- `src/core/events.ts`
- `tests/core/events.test.ts`

核心类型：

- `AgentEvent`
- `RunState`
- `createRunState`
- `appendEvent`

事件类型覆盖：

- `agent.started`
- `llm.started`
- `llm.delta`
- `tool.requested`
- `tool.completed`
- `agent.completed`
- `agent.failed`
- `agent.cancelled`

设计说明：

- `AgentEvent` 是后续 UI、Trace、Replay、Eval 的共同基础。
- 所有事件都会自动补充 `taskId`、`runId`、`timestamp`。
- 事件追加保持不可变风格，便于测试和后续回放。

### 2.3 模型适配器基础

新增：

- `src/model/types.ts`
- `src/model/scripted-model.ts`
- `src/model/echo-model.ts`
- `tests/model/scripted-model.test.ts`

能力：

- 定义统一模型请求和响应 chunk。
- 支持 `text_delta`、`tool_call`、`message_completed`。
- `ScriptedModelClient` 用于可重复测试。
- `EchoModelClient` 用于 CLI 本地演示。

设计说明：

- 阶段 1 不直接接真实模型，避免 API Key、网络和模型不确定性影响 Runtime 测试。
- 后续真实模型适配只需要实现 `ModelClient` 接口。

### 2.4 最小 Agent Loop

新增：

- `src/runtime/agent-loop.ts`
- `tests/runtime/agent-loop.test.ts`

能力：

- 创建 run state。
- 发送 `agent.started` 事件。
- 每轮模型调用发送 `llm.started`。
- 文本流式 chunk 转换为 `llm.delta`。
- 无工具调用时发送 `agent.completed`。
- 工具调用时发送 `tool.requested`。
- 执行工具后发送 `tool.completed`。
- 工具结果写入 messages，供下一轮模型调用使用。
- 达到最大迭代次数后发送 `agent.failed`。
- 已取消时发送 `agent.cancelled`。

测试覆盖：

- 文本直接完成。
- 工具调用后继续模型下一轮。
- 超过最大迭代次数失败。
- 已中止信号直接取消。

### 2.5 内置只读工具

新增：

- `src/tools/types.ts`
- `src/tools/builtin-tools.ts`
- `tests/tools/builtin-tools.test.ts`

工具：

- `read_file`
- `list_files`
- `search_text`

设计说明：

- 三个工具都只读，适合作为阶段 1 基础观察能力。
- 工具路径相对于 workspace root 解析。
- 基础防护：路径不能逃出 workspace。
- `list_files` 默认跳过 `.git`、`node_modules`、`dist`。

### 2.6 CLI 入口

新增：

- `src/cli/run-cli.ts`
- `src/cli/index.ts`
- `tests/cli/run-cli.test.ts`

能力：

- `npm start -- <prompt>` 运行本地 Echo 模型。
- 输出 JSONL 格式 AgentEvent。
- 没有 prompt 时返回 usage 错误。

示例：

```bash
npm start -- hello phase one
```

输出包含：

- `agent.started`
- `llm.started`
- `llm.delta`
- `agent.completed`

## 3. 测试与验证

### 3.1 自动化测试

命令：

```bash
npm test
```

最后一次验证结果：

```text
tests 14
pass 14
fail 0
```

覆盖范围：

- smoke test。
- AgentEvent 与 RunState。
- ScriptedModelClient。
- Agent Loop。
- 内置只读工具。
- CLI 入口。

### 3.2 构建验证

命令：

```bash
npm run build
```

结果：

```text
tsc -p tsconfig.json
exit 0
```

### 3.3 CLI 手动验证

命令：

```bash
npm start -- hello phase one
```

结果：

- 退出码：0。
- 输出 JSONL 事件流。
- 最终事件：`agent.completed`。
- 输出内容：`Harness received: hello phase one`。

## 4. Git 提交记录

阶段 1 相关提交：

```text
490a85c chore: scaffold TypeScript runtime project
f605565 feat: add agent event run state
112d9c6 feat: add scripted model client
3d26410 feat: implement minimal agent loop
b585dbd feat: add builtin read-only tools
134e658 feat: add CLI runtime entrypoint
```

基线文档提交：

```text
465e028 docs: add harness design reports
```

## 5. 开发中遇到的问题

### 5.1 Git 初始化被沙箱阻止

现象：

```text
/Users/utopia/Code/harness_learn/.git: Operation not permitted
```

原因：

- 当前执行环境对 `.git` 写入有保护。

处理：

- 按权限流程申请提升权限后执行 `git init -b main`。

### 5.2 `npm install` 在沙箱内挂起

现象：

- `npm install` 在默认沙箱中无输出挂起。

原因：

- 依赖下载需要访问 npm registry，默认网络受限。

处理：

- 停止挂起进程。
- 按权限流程使用网络权限重跑 `npm install`。

### 5.3 Node 测试 glob 未递归执行

现象：

- 初始脚本 `node --test dist/**/*.test.js` 只执行了顶层 smoke test，未执行嵌套测试。

处理：

- 改为带引号的 glob：

```json
"test": "npm run build && node --test \"dist/tests/**/*.test.js\""
```

结果：

- 嵌套测试可以正确执行。

### 5.4 CLI 构建产物路径错误

现象：

```text
Cannot find module '/Users/utopia/Code/harness_learn/dist/cli/index.js'
```

原因：

- `tsconfig.json` 的 `rootDir` 是项目根目录，源码会输出到 `dist/src/...`。

处理：

- 修正 `package.json`：

```json
"start": "node dist/src/cli/index.js"
```

### 5.5 TDD 记录

已按红绿节奏完成的能力：

- 事件模型：先写测试，确认模块缺失失败，再实现。
- 脚本模型：先写测试，确认模块缺失失败，再实现。
- Agent Loop：先写测试，确认模块缺失失败，再实现。
- 内置工具：先写测试，确认模块缺失失败，再实现。
- CLI：先写测试，确认模块缺失失败，再实现。

补充说明：

- `runAgent` 的取消逻辑在首轮实现中已经包含，随后补充了取消行为测试，并通过验证。

## 6. 当前限制

阶段 1 仍有以下限制：

- 未接入真实 LLM Provider。
- 未实现 ToolContract 中的权限、只读性、并发安全等元数据。
- 未实现权限审批。
- 未实现 MCP。
- 未实现 Skill。
- 未实现沙箱执行。
- 未实现持久化任务中心。
- 未实现复杂上下文压缩。
- CLI 使用 Echo 模型，仅用于本地链路验证。

## 7. 下一阶段建议

阶段 2 应优先实现：

1. 完整 `ToolContract`。
2. 写文件工具。
3. 先读后写校验增强。
4. 命令执行工具。
5. 权限模式：
   - `read_only`
   - `default`
   - `accept_edits`
   - `auto`
6. 审批事件与审批记录。
7. 工具输出大小限制。

阶段 2 的重点不是增加更多工具，而是让工具调用进入安全闭环。
