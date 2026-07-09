# 阶段 5 实现文档：Skill、SubAgent 与 Replay/Eval 闭环

## 1. 阶段目标

阶段 5 的目标是将 Harness 从单次任务执行器升级为可复用、可协作、可回归的 Agent 平台：

- 支持 Skill 文件格式、加载、触发和版本管理。
- 支持 Skill 工具白名单，避免 Skill 获得过宽工具权限。
- 支持只读子 Agent 并发执行。
- 保证子 Agent 上下文隔离，不污染主 Agent 上下文。
- 支持从历史 trace 生成 replay case。
- 支持发布前 Eval Gate，用于发现输出或工具调用序列回归。

本阶段不直接接入 promptfoo、DeepEval、LangGraph 或 AutoGen。当前优先稳定 Harness 自己的治理接口和回归语义，后续可以把这些开源组件作为 runner、judge 或 orchestration adapter 接入。

## 2. 已完成能力

### 2.1 Skill Runtime

新增：

- `src/skills/skill-runtime.ts`
- `tests/skills/skill-runtime.test.ts`

核心类型：

- `Skill`
- `SkillActivation`
- `SkillRepository`
- `loadSkillFromMarkdown`
- `selectSkillsForTask`
- `createSkillRepository`

Skill 文件格式：

- Markdown 正文。
- YAML frontmatter。
- 支持字段：
  - `id`
  - `name`
  - `version`
  - `description`
  - `activation`
  - `triggers`
  - `allowedTools`

能力：

- 解析 Markdown + YAML frontmatter。
- 支持 `explicit` 显式调用。
- 支持 `semantic` 语义触发初筛。
- 支持 Skill 工具白名单。
- 支持内存版本历史。
- 支持按版本回滚。

设计说明：

- 当前 YAML 解析器是轻量实现，只支持阶段 5 所需字段。
- 这避免引入额外依赖，同时保证 Skill Runtime 的治理语义先闭合。
- 后续可以替换为成熟 YAML parser，但 Skill 类型和仓库接口不需要改变。

### 2.2 SubAgent Manager

新增：

- `src/subagents/subagent-manager.ts`
- `tests/subagents/subagent-manager.test.ts`

核心类型：

- `SubAgentTask`
- `SubAgentRunTask`
- `SubAgentResult`
- `SubAgentRunner`
- `SubAgentManager`
- `createSubAgentManager`

能力：

- 支持只读子 Agent 并发执行。
- 子 Agent 默认使用 `read_only` 权限模式。
- 子 Agent 工具白名单只能包含只读工具：
  - `read_file`
  - `list_files`
  - `search_text`
  - `read_tool_output`
- 拒绝写工具和命令工具。
- 每个子 Agent 收到独立 context 拷贝。
- 汇总多个子 Agent 的结果摘要。

设计说明：

- 当前 manager 通过注入 `SubAgentRunner` 运行任务，不直接绑定 `runAgent`。
- 这样可以先验证权限和上下文边界。
- 后续可用 `SubAgentRunner` 适配真实 Agent Loop、LangGraph 或其他多 Agent 框架。

### 2.3 ReplayCase 与 Eval Gate

新增：

- `src/eval/replay-eval.ts`
- `tests/eval/replay-eval.test.ts`

核心类型：

- `ReplayCase`
- `ReplayRunResult`
- `ReplayRunner`
- `EvalCaseResult`
- `EvalGateResult`
- `createReplayCaseFromTrace`
- `runEvalGate`

能力：

- 从 `AgentTrace` 生成 `ReplayCase`。
- ReplayCase 捕获：
  - trace ID
  - task ID
  - 用户输入
  - 期望最终输出
  - 期望工具调用序列
- Eval Gate 可运行 replay runner。
- 当最终输出变化时失败。
- 当工具调用序列变化时失败。
- 所有 case 通过时 gate 才通过。

设计说明：

- Harness 的质量关注过程正确性，不只关注最终答案。
- 因此 Eval Gate 同时校验输出和工具序列。
- 后续可以把 `ReplayRunner` 接到 promptfoo，把 judge 接到 DeepEval、Inspect AI 或自研 LLM judge。

## 3. 测试与验证

### 3.1 自动化测试

命令：

```bash
npm test
```

最后一次验证结果：

```text
tests 61
pass 61
fail 0
```

覆盖范围：

- Skill frontmatter 解析。
- Skill 显式调用。
- Skill 语义触发初筛。
- Skill 工具白名单。
- Skill 版本历史和回滚。
- 只读子 Agent 并发。
- 子 Agent 上下文隔离。
- 子 Agent 写工具拒绝。
- 从 trace 生成 replay case。
- Eval Gate 输出回归检测。
- Eval Gate 工具序列回归检测。
- 阶段 1 到阶段 4 原有 Runtime、权限、上下文、安全和 Trace 测试回归。

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

阶段 5 相关提交：

- `0bee09c feat: add governed skill runtime`
- `5455069 feat: add read-only subagent manager`
- `5b58a4a feat: add replay eval gate`

## 5. 实施中遇到的问题

### 5.1 未引入完整 YAML parser

原因：

- 当前 Skill 格式字段较少。
- 阶段 5 的关键是治理语义，而不是 YAML 语法覆盖率。
- 引入依赖需要网络安装，会增加环境变量。

处理：

- 实现轻量 frontmatter parser，覆盖字符串字段和列表字段。
- 后续如果 Skill 文件格式变复杂，再替换为成熟 YAML parser。

### 5.2 SubAgent Runner 未直接接入 runAgent

原因：

- 阶段 5 优先验证子 Agent 权限和上下文隔离。
- 直接接入 `runAgent` 会引入模型、工具、审批和 trace 的更多耦合。

处理：

- 通过 `SubAgentRunner` 注入执行器。
- 当前测试使用内存 runner。
- 后续可以提供 `createRunAgentSubAgentRunner()` 适配真实 Runtime。

### 5.3 未直接集成 promptfoo / DeepEval

原因：

- 当前项目还没有外部模型、prompt matrix 和评测数据集服务。
- 直接接入框架会让阶段 5 变成配置工程。

处理：

- 先实现 `ReplayCase` 和 `EvalGate` 的内部接口。
- 后续把 promptfoo / DeepEval 作为 runner 或 judge adapter 接入。

## 6. 阶段 5 完成情况

对照路线图验收标准：

- Skill 不会全量注入上下文：已完成，只有被选中的 Skill 返回给执行层。
- 高风险 Skill 可以设置显式调用：已完成 `activation: explicit`。
- 子 Agent 中间过程不会污染主 Agent 上下文：已完成独立 context 拷贝和结果摘要。
- 历史任务可以 replay：已完成从 trace 生成 ReplayCase。
- Prompt、Skill、工具描述变更可以跑回归：已完成 Eval Gate 的输出和工具序列校验 MVP。

阶段 5 已形成 Skill、SubAgent 和 Replay/Eval 的最小闭环。后续阶段可以继续接入真实多 Agent 执行器、评测框架和团队级发布门禁。
