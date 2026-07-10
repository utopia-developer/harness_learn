# 阶段 8：产品化接入实现记录

> 阶段 8 按照阶段 7 后的检查建议推进：先接真实模型，再补任务持久化，最后提供 Trace/审批控制台基础视图。

## 功能点 1：OpenAI/LiteLLM 兼容模型客户端

### 目标

- 让 Harness 不再只能依赖 `EchoModelClient`，可以连接 OpenAI、LiteLLM 或其他 OpenAI-compatible Chat Completions 网关。
- 保持 `ModelClient` 接口稳定，Runtime 主循环无需知道具体模型供应商。
- CLI 在没有环境变量时继续使用 Echo，便于本地无密钥测试。

### 实现

- 新增 `src/model/openai-compatible-model.ts`。
- `OpenAICompatibleModelClient` 使用 OpenAI-compatible `/chat/completions` streaming 协议。
- 支持从 SSE 中解析：
  - `delta.content` -> `text_delta`
  - `finish_reason: "stop"` -> `message_completed`
  - `delta.tool_calls` + `finish_reason: "tool_calls"` -> `tool_call`
- 修改 `src/cli/run-cli.ts`，支持以下环境变量：
  - `HARNESS_MODEL_PROVIDER=openai-compatible`
  - `HARNESS_MODEL_NAME`
  - `HARNESS_MODEL_BASE_URL`
  - `HARNESS_MODEL_API_KEY`

### 测试验证

- 新增 `tests/model/openai-compatible-model.test.ts`。
- 更新 `tests/cli/run-cli.test.ts`。
- 覆盖请求构造、SSE 文本流、工具调用流、上游错误、CLI 配置选择。
- 验证命令：`npm test`。
- 当前结果：83 个测试全部通过。

### 问题记录

- 当前实现不引入 OpenAI SDK，减少依赖和网络安装要求。
- 由于现有 `ModelRequest` 暂未包含工具 schema，真实 provider 的工具可见性仍需要后续把 Tool Registry 的可用工具声明传入模型请求。
