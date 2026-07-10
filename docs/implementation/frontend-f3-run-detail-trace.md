# 前端 F3：Run Detail 与 Trace Timeline 实现记录

> 本阶段基于 `reports/harness-frontend-implementation-roadmap.md` 的 F3 范围推进：实现 `/tasks/:taskId/runs/:runId` 运行详情页、Trace Timeline、Event Detail、工具输入输出、大输出引用、SSE 事件流语义和 Replay Case 入口。

## 功能点 1：Run Trace 契约与 API Gateway

### 目标

- 补齐 F3 后端依赖 API：
  - `GET /api/v1/tasks/:taskId/runs/:runId/trace`
  - `GET /api/v1/tasks/:taskId/runs/:runId/stream`
  - `GET /api/v1/tool-outputs/:ref`
  - `GET /api/v1/traces/:traceId/replay-case`
- Trace API 能表达 Timeline、失败模块、权限请求、工具调用、模型输出和大输出引用。
- Stream API 先提供 SSE 文本快照，后续可替换为真实长连接。

### 实现

- 更新 `packages/contracts/src/index.ts`。
  - 新增 `RunTraceResponse`、`RunTraceEventDto`、`ToolOutputResponse`、`ReplayCaseResponse`。
  - 新增 F3 endpoint builder。
- 新增 `apps/api/src/run-trace-store.ts`。
  - 提供 demo trace 数据：
    - running trace：包含权限请求。
    - failed trace：包含工具调用、大输出引用和失败模块。
    - completed trace：用于 replay case。
  - 将后端 `AgentEvent` 转为前端可消费的 timeline DTO。
  - 复用 `createReplayCaseFromTrace()` 生成 replay case。
- 更新 `apps/api/src/server.ts`。
  - 接入 run trace、run stream、tool output、replay case 路由。
  - `sendJson()` 支持非 JSON 文本响应，用于 SSE。

### 测试验证

- 新增 `tests/api/run-trace-api.test.ts`。
- 覆盖：
  - Run trace timeline 和失败模块。
  - SSE 文本事件。
  - tool output ref 查询。
  - replay case 查询。
- 验证命令：`npm test`。
- 当前结果：119 个测试全部通过。

### 问题记录

- F3 的 `stream` endpoint 在当前 Node test 环境中不适合做真实长连接测试。
- 处理方式：API 先返回 `text/event-stream` 格式的事件快照，保持 SSE 协议文本语义；后续接入真实 HTTP server 时可以将同一事件序列改为逐条推送。
