# 阶段 4 实现文档：安全、隔离与 Trace 闭环

## 1. 阶段目标

阶段 4 的目标是把 Harness 从「可用」推进到「可信」：

- 为命令执行定义本地 sandbox profile。
- 在工具执行前校验 workspace 文件访问边界。
- 为命令执行引入统一超时策略。
- 为命令参数中的网络访问引入 allowlist。
- 对 LLM 输出、工具输出和事件流做敏感信息脱敏。
- 为每次 run 贯穿 `traceId`。
- 提供基础 TraceCollector，支持定位失败发生在哪个模块。

本阶段仍不接入真实 Docker、OpenTelemetry、Langfuse 或 Phoenix 后端。原因是当前项目仍是本地 Runtime MVP，优先稳定内部安全策略和 Trace Schema。后续可以在现有接口上接入真实沙箱和观测后端。

## 2. 已完成能力

### 2.1 Sandbox Profile 与命令策略

新增 / 修改：

- `src/security/sandbox-profile.ts`
- `tests/security/sandbox-profile.test.ts`
- `src/tools/builtin-tools.ts`
- `tests/tools/builtin-tools.test.ts`

核心类型：

- `SandboxProfile`
- `NetworkPolicy`
- `createSandboxProfile`
- `validateCommandSandbox`

能力：

- 默认 sandbox root 为 workspace root。
- 命令 `cwd` 必须位于允许路径内。
- 命令参数中的绝对路径不能逃出允许路径。
- 默认网络策略为 `deny_all`。
- 支持 `allowlist` 网络策略。
- `run_command` 执行前会调用 sandbox 校验。
- `run_command` 使用 `SandboxProfile.commandTimeoutMs` 控制超时。

设计说明：

- 当前实现属于本地进程前置策略校验，不等同于 OS 级隔离。
- 该层解决的是 Harness 内部的 Policy Mapping：不同工具在执行前必须先通过统一策略。
- 后续可以把 `SandboxProfile` 映射到 Docker、bubblewrap、E2B 或远程执行器。

### 2.2 敏感信息脱敏

新增 / 修改：

- `src/security/redactor.ts`
- `tests/security/redactor.test.ts`
- `src/runtime/agent-loop.ts`
- `tests/runtime/agent-loop.test.ts`

核心类型：

- `RedactionRule`
- `SecretRedactor`
- `createSecretRedactor`

默认规则：

- OpenAI 风格 API key：`sk-...`
- AWS access key：`AKIA...`
- Bearer token

接入位置：

- 用户输入送入模型前。
- LLM `text_delta` 事件。
- LLM `message_completed` 最终输出。
- `tool.requested` 的输入事件。
- `permission.requested` 的输入事件。
- 审批处理器收到的输入。
- 工具输出进入事件和下一轮模型上下文前。
- 任务完成后写入记忆前。

设计说明：

- 脱敏在 Runtime 边界完成，不依赖模型自觉。
- 当前规则是正则匹配，后续可接入 detect-secrets 或 trufflehog。
- 当前策略选择直接替换为 `[REDACTED:<rule>]`，方便调试时知道命中了哪类规则。

### 2.3 traceId 贯穿事件流

新增 / 修改：

- `src/core/events.ts`
- `tests/core/events.test.ts`
- `src/runtime/agent-loop.ts`
- `tests/runtime/agent-loop.test.ts`

能力：

- `EventBase` 新增 `traceId`。
- `createRunState()` 支持传入自定义 `traceId`。
- 未传入时默认使用 `<runId>-trace`。
- `appendEvent()` 会继承 run 的 `traceId`。
- `runAgent()` 支持 `traceId` 入参。
- 所有 AgentEvent 都带同一个 `traceId`。

设计说明：

- `traceId` 是后续 OpenTelemetry、Langfuse、Phoenix 和 UI Debug Console 的关联主键。
- `traceId` 放在事件基类中，而不是仅放在外部日志层，保证 Replay 和审计也能使用同一 ID。

### 2.4 TraceCollector

新增：

- `src/trace/trace-collector.ts`
- `tests/trace/trace-collector.test.ts`

核心类型：

- `AgentTrace`
- `TraceFailure`
- `TraceCollector`
- `createTraceCollector`

能力：

- 按 `traceId` 收集事件。
- 支持查询单条 trace。
- 支持列出所有 trace。
- `agent.failed` 出现时记录失败摘要。
- 能根据失败前最近事件推断失败模块：
  - `tool`
  - `permission`
  - `llm`
  - `agent`

Runtime 接入：

- `runAgent()` 支持传入 `traceCollector`。
- 每个事件产生后会同步写入 collector。
- 初始 `agent.started` 也会进入 collector。

设计说明：

- 当前 TraceCollector 是内存实现，适合测试和本地调试。
- 后续可新增 OpenTelemetry exporter、Langfuse exporter 或 Phoenix exporter。
- Agent Trace Schema 保留 Harness 语义，不直接套普通 LLM Trace。

## 3. 测试与验证

### 3.1 自动化测试

命令：

```bash
npm test
```

最后一次验证结果：

```text
tests 52
pass 52
fail 0
```

覆盖范围：

- sandbox workspace 路径边界。
- sandbox 网络 allowlist。
- `run_command` 策略接入和超时。
- redactor 单元测试。
- Runtime LLM 输出和工具输出脱敏。
- 事件 `traceId` 默认值和继承。
- Runtime 事件 trace 记录。
- TraceCollector 失败模块定位。
- 阶段 1 到阶段 3 原有 Runtime、权限、上下文、记忆和 MCP 测试回归。

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

阶段 4 相关提交：

- `77e580f feat: add sandbox command policy`
- `78152ad feat: redact secrets in runtime outputs`
- `8b23f24 feat: add runtime trace collector`

## 5. 实施中遇到的问题

### 5.1 Sandbox 错误文案与旧测试不兼容

现象：

- 新 sandbox 策略返回 `Path is outside sandbox`。
- 旧测试仍期望 `escapes workspace`。

处理：

- 错误文案调整为同时包含 workspace escape 和 sandbox 语义。
- 这样保留阶段 1 的路径边界表达，也反映阶段 4 的 sandbox 策略语义。

### 5.2 traceId 加入 EventBase 后旧事件断言失败

现象：

- `createRunState` 和 `appendEvent` 的旧测试未包含 `traceId` 字段。

处理：

- 更新 core 事件测试，明确默认 `traceId` 为 `<runId>-trace`。
- 新增 Runtime 测试，确认自定义 `traceId` 会贯穿所有事件。

### 5.3 未接入 Docker / OpenTelemetry / Langfuse

原因：

- 当前阶段目标是稳定 Harness 内部安全和观测契约。
- Docker、OpenTelemetry、Langfuse、Phoenix 都需要额外服务或依赖配置。
- 过早接入会让测试依赖外部环境，削弱本地 Runtime 的确定性。

后续思路：

- 用 `SandboxProfile` 映射真实 Docker 或 bubblewrap profile。
- 为 `TraceCollector` 增加 OTel exporter。
- 为 `AgentTrace` 增加 Langfuse / Phoenix exporter。
- 用 detect-secrets 或 trufflehog 替换 / 增强 `SecretRedactor` 的规则层。

## 6. 阶段 4 完成情况

对照路线图验收标准：

- 命令执行不能越权访问配置外路径：已完成前置策略校验。
- 敏感 key 不会被原样送入模型或输出给用户：已完成 Runtime 边界脱敏。
- 每次任务都能看到 LLM、工具、权限、压缩事件：已完成事件统一 `traceId` 和 TraceCollector。
- 可以定位一次失败发生在哪个模块：已完成基础失败模块推断。

阶段 4 已形成安全、隔离和 Trace 的最小可信闭环。生产级 OS 隔离、密钥扫描器和外部观测后端留到后续阶段扩展。
