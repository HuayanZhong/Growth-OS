# ai-chat-stream

## Purpose

定义 AI 流式聊天主流程的端到端行为：SSE 端点契约、ChatStreamEvent 事件集与帧格式、直通编排、模型接入最小形态与错误/中断语义。为意图路由、工具调用与会话持久化预留事件名与插入点，后续以加法变更扩展。

## Requirements

### Requirement: SSE 聊天端点

系统 SHALL 提供 `POST /chat/stream` 端点：要求 Bearer JWT 鉴权，请求体经 zod 校验（agent 标识 + 消息历史数组），校验通过时以 `text/event-stream` 建立流式响应；鉴权与校验失败 SHALL 在流建立前以 ApiErrorEnvelope（机器可读 code）返回。流式响应 SHALL 不受通用请求超时限制。

#### Scenario: 合法请求建立流

- **WHEN** 客户端携带有效 Bearer JWT 与合法请求体调用端点
- **THEN** 服务端返回 200 且 Content-Type 为 `text/event-stream`，随后开始下发事件帧

#### Scenario: 缺失或无效 JWT

- **WHEN** 请求未携带 Bearer JWT 或 JWT 校验失败
- **THEN** 返回 ApiErrorEnvelope 错误响应且不建立 SSE 流

#### Scenario: 请求体非法

- **WHEN** 请求体缺失 agent 标识或消息历史不符合 schema
- **THEN** 返回 ApiErrorEnvelope 错误响应，code 机器可读，且不建立 SSE 流

#### Scenario: 长生成不被超时中断

- **WHEN** 模型生成耗时超过服务端通用请求超时阈值
- **THEN** 流保持打开直至生成完成或客户端中断

### Requirement: 帧格式与事件集

SSE 数据帧 SHALL 采用 `data: <单个事件 JSON>` 格式，每帧恰好一个事件；事件 SHALL 以 `type` 字段判别。S 期 SHALL 仅发出以下事件：`run_started`、`text_message_start`、`text_message_content`、`text_message_end`、`run_finished`、`error`。契约 SHALL 声明预留事件名 `tool_call_start`、`tool_call_args`、`tool_call_end`、`intent_clarification`、`intent_reroute`，且 S 期不得发出预留事件。

#### Scenario: 帧为单事件 JSON

- **WHEN** 客户端解析任意 SSE 数据帧
- **THEN** 该帧恰好包含一个可解析 JSON 对象且携带 `type` 字段

#### Scenario: 正常回复的完整事件序

- **WHEN** 一次回复正常完成
- **THEN** 事件流呈现 `run_started` → `text_message_start` → 一至多个 `text_message_content` → `text_message_end` → `run_finished` 的顺序，随后服务端关闭流

#### Scenario: 增量顺序拼接等于完整回复

- **WHEN** 客户端按到达顺序拼接所有 `text_message_content` 的增量文本
- **THEN** 拼接结果与 `text_message_start` 至 `text_message_end` 之间的完整回复文本一致

### Requirement: 直通编排与模型接入

端点 SHALL 将任意合法输入直接交由编排引擎生成回复（S 期不做意图路由、不做工具调用）；回复 SHALL 由模型接入模块的注册供应商生成（S 期为代码内常量注册的唯一供应商 DeepSeek，默认模型 `deepseek-flash`）。`DEEPSEEK_API_KEY` SHALL 为服务端必需环境变量，缺失时服务端启动失败。请求 SHALL 支持可选的模型标识（`modelId`）：标识不在注册表内 SHALL 被请求校验以 ApiErrorEnvelope 拒绝且不建立流；未携带 `modelId`（Auto）时编排 SHALL 按请求内容动态选择模型——消息携带 `image_url` 分段时 SHALL 路由至注册表中具备视觉能力的模型，否则使用供应商默认模型。供应商注册表 SHALL 为每个模型标注视觉能力；编排 SHALL 将消息分段（含 `image_url`）按当前模型的视觉能力映射为供应商可消费的消息内容——视觉模型透传图片分段，非视觉模型 SHALL 将图片分段降级为文本占位并保持流正常完成，SHALL 不得因历史消息携带图片而报错或中断。图片仅随请求内存传递，编排层 SHALL 不引入落盘、缓存或重试重取。

#### Scenario: 任意输入获得模型回复

- **WHEN** 客户端发送任意自然语言消息
- **THEN** 服务端经编排引擎生成模型回复并流式下发

#### Scenario: API Key 缺失阻断启动

- **WHEN** 服务端环境中缺少 `DEEPSEEK_API_KEY` 并尝试启动
- **THEN** 环境校验失败，服务端拒绝启动

#### Scenario: Auto 模式带图消息路由至视觉模型

- **WHEN** 请求未携带 `modelId`（Auto）且末条 user 消息携带 `image_url` 分段
- **THEN** 编排将请求路由至具备视觉能力的模型，回复引用该图片的实际内容（描述、识别文字或回答图中问题）

#### Scenario: Auto 模式纯文本消息走默认模型

- **WHEN** 请求未携带 `modelId`（Auto）且消息历史不含图片分段
- **THEN** 编排使用供应商默认模型生成回复，流正常完成

#### Scenario: 未知模型标识被拒绝

- **WHEN** 请求携带的 `modelId` 不在供应商注册表内
- **THEN** 返回 ApiErrorEnvelope 错误响应（code 机器可读）且不建立 SSE 流

#### Scenario: 非视觉模型图片分段降级

- **WHEN** 请求使用非视觉模型且消息历史携带 `image_url` 分段
- **THEN** 图片分段以文本占位传递给模型，流正常建立与完成（无 `error` 事件），回复不中断

### Requirement: 客户端中断传播

客户端中断连接后，服务端 SHALL 终止进行中的模型调用并停止产出事件。

#### Scenario: 客户端 abort 后服务端终止

- **WHEN** 客户端在生成进行中断开连接（AbortController）
- **THEN** 服务端中止模型调用，不再产出任何事件

### Requirement: 流内错误面

流建立后发生的错误 SHALL 以 `error` 事件（code + message）下发并随后关闭流；code SHALL 机器可读，message SHALL 不暴露内部实现细节（无堆栈、无供应商内部信息）。

#### Scenario: 模型调用失败

- **WHEN** 模型供应商调用失败（网络错误或上游错误）
- **THEN** 客户端收到 `error` 事件后流关闭，事件内容不含内部堆栈与上游原始错误细节

### Requirement: 请求携带多轮上下文

端点 SHALL 以请求体携带的消息历史作为模型上下文；服务端 SHALL 不持久化会话状态（无会话表、无引擎态存储），重启后仅凭相同请求体 SHALL 可重建相同上下文。消息条目的 `content` SHALL 为纯字符串或分段数组：分段为 `text`（文本）与 `image_url`（图片，`url` 为 base64 data URL）两类；`image_url` 段 SHALL 仅允许出现在 user 消息，出现在 assistant 消息或不支持的 `url` 形态 SHALL 被请求校验以 ApiErrorEnvelope 拒绝且不建立流。图片内容 SHALL 不落任何存储（无对象存储、无服务端临时文件）。

#### Scenario: 携带历史时回复引用上文

- **WHEN** 请求体消息历史包含先前轮次且新消息询问先前内容
- **THEN** 模型回复引用历史轮次中的信息

#### Scenario: 服务端重启无状态损失

- **WHEN** 服务端重启后收到与重启前相同的请求体
- **THEN** 回复质量与上下文引用不受重启影响

#### Scenario: 分段消息建立流

- **WHEN** 请求体消息历史包含携带 `text` 与 `image_url` 分段的 user 消息
- **THEN** 请求校验通过并以 `text/event-stream` 建立流

#### Scenario: assistant 消息携带图片被拒绝

- **WHEN** 请求体中 assistant 消息的 `content` 含 `image_url` 段
- **THEN** 返回 ApiErrorEnvelope 错误响应（code 机器可读）且不建立 SSE 流

#### Scenario: 图片 URL 形态非法被拒绝

- **WHEN** 请求体中 `image_url` 段的 `url` 不是 base64 图片 data URL
- **THEN** 返回 ApiErrorEnvelope 错误响应且不建立 SSE 流
