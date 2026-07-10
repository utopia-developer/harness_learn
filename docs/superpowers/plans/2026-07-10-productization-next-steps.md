# Harness 产品化下一步实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 按检查建议顺序补齐真实模型接入、任务持久化与控制台基础能力。

**架构：** 保持 Harness Core 自研接口稳定，在边缘新增适配层。模型接入实现 OpenAI-compatible 协议，可连接 OpenAI、LiteLLM 或兼容网关；任务服务先提供文件持久化实现；控制台先提供只读视图模型，供后续 Web Console 渲染。

**技术栈：** TypeScript、Node.js `fetch`、Node.js `fs/promises`、内置 `node:test`。

---

## 文件结构

- 创建 `src/model/openai-compatible-model.ts`：OpenAI/LiteLLM 兼容 Chat Completions 模型客户端。
- 修改 `src/cli/run-cli.ts`：支持通过环境变量选择真实模型客户端，未配置时继续使用 Echo。
- 创建 `tests/model/openai-compatible-model.test.ts`：覆盖请求构造、SSE 解析、工具调用解析、错误处理。
- 修改 `tests/cli/run-cli.test.ts`：覆盖 CLI 选择配置模型的行为。
- 创建 `src/tasks/task-service.ts`：任务、运行、事件、检查点的文件持久化服务。
- 创建 `tests/tasks/task-service.test.ts`：覆盖任务创建、事件追加、状态恢复、检查点恢复。
- 创建 `src/console/console-view.ts`：Trace、审批、任务概览的只读控制台视图模型。
- 创建 `tests/console/console-view.test.ts`：覆盖 Trace 摘要、审批队列、任务状态聚合。
- 创建 `docs/implementation/phase-8-productization.md`：记录每个功能点、验证结果和问题。

## 任务 1：OpenAI/LiteLLM 兼容模型客户端

**文件：**
- 创建：`src/model/openai-compatible-model.ts`
- 修改：`src/cli/run-cli.ts`
- 测试：`tests/model/openai-compatible-model.test.ts`
- 测试：`tests/cli/run-cli.test.ts`

- [ ] **步骤 1：编写失败测试**

覆盖：
- `OpenAICompatibleModelClient` 向 `/chat/completions` 发送 stream 请求。
- 从 SSE `delta.content` 产生 `text_delta`。
- 从 SSE `tool_calls` 产生内部 `tool_call`。
- `message_completed` 产生最终文本。
- CLI 在 `HARNESS_MODEL_PROVIDER=openai-compatible` 时使用配置模型名称。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`
预期：FAIL，报错缺少 `openai-compatible-model` 模块或 CLI 配置行为。

- [ ] **步骤 3：实现最少代码**

实现一个不依赖 SDK 的 OpenAI-compatible adapter，注入 `fetch` 便于测试；CLI 读取 `HARNESS_MODEL_PROVIDER`、`HARNESS_MODEL_NAME`、`HARNESS_MODEL_BASE_URL`、`HARNESS_MODEL_API_KEY`。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`
预期：全部测试通过。

- [ ] **步骤 5：文档与提交**

更新 `docs/implementation/phase-8-productization.md`，提交：`feat: add openai compatible model client`。

## 任务 2：文件持久化 Task Service

**文件：**
- 创建：`src/tasks/task-service.ts`
- 测试：`tests/tasks/task-service.test.ts`

- [ ] **步骤 1：编写失败测试**

覆盖：
- 创建任务并落盘。
- 追加运行事件并恢复任务状态。
- 保存检查点并读取最近检查点。
- 重新创建 service 后可以读取已有任务。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`
预期：FAIL，报错缺少 `task-service` 模块。

- [ ] **步骤 3：实现最少代码**

实现 JSON 文件存储，所有写入使用接口方法完成；路径由调用者传入，测试使用临时目录。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`
预期：全部测试通过。

- [ ] **步骤 5：文档与提交**

更新 `docs/implementation/phase-8-productization.md`，提交：`feat: add persistent task service`。

## 任务 3：Trace/审批控制台基础视图

**文件：**
- 创建：`src/console/console-view.ts`
- 测试：`tests/console/console-view.test.ts`

- [ ] **步骤 1：编写失败测试**

覆盖：
- 从任务、trace、审批记录生成任务概览。
- 对 trace 事件归类统计 LLM、工具、权限和失败信息。
- 生成等待审批队列视图。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`
预期：FAIL，报错缺少 `console-view` 模块。

- [ ] **步骤 3：实现最少代码**

实现纯函数视图模型，不引入 Web 框架；后续 Next.js 或 CLI TUI 可直接消费该模型。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`
预期：全部测试通过。

- [ ] **步骤 5：文档与提交**

更新 `docs/implementation/phase-8-productization.md`，提交：`feat: add console view models`。

## 自检

- 规格覆盖：三项建议优先级均有任务覆盖。
- 占位符扫描：计划不包含待定实现点。
- 类型一致性：模型客户端实现 `ModelClient`；任务服务消费 `AgentEvent`；控制台视图消费任务、trace、审批记录。
