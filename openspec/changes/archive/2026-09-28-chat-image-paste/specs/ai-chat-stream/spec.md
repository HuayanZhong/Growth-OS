## MODIFIED Requirements

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
