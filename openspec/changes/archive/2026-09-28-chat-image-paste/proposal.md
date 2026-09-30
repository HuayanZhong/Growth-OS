# 提案：聊天图片输入（Coze 式粘贴）

## Why

AI 对话目前只接受纯文本，用户无法粘贴截图、照片让 AI"看图"回答。供应商侧 `deepseek-flash` 已原生支持图片输入（OpenAI 兼容 content 分段格式，官方文档确认），补上这条链路即可解锁识图能力，且无需引入第二家模型供应商。

## What Changes

- 前端输入区支持 **Ctrl+V 粘贴图片**与 `+` 按钮文件选择，粘贴后呈现 Coze 式附件卡片（缩略图 + 自动生成文件名 + 格式标签 + 删除），粘贴文本行为不变
- 新增**前端压缩管线**（四层防御）：原始 ≤25MB 入口拦截 → `createImageBitmap` 解码即缩（长边 ~1024）→ JPEG 质量循环（产物 ≤1MB）→ 解码失败兜底拒绝；全程浏览器原生 API，零新依赖
- **BREAKING**：`/chat/stream` 请求契约中消息 `content` 从纯字符串升级为分段数组（`text` 段 + `image_url` 段，data URL 形态）；`image_url` 段仅允许出现在 user 消息（供应商红线：assistant/system 带图返回 400）。前后端同仓同步发布，无外部 API 消费者
- 服务端 graph 层将契约分段 1:1 映射为 LangChain content blocks 透传 `ChatDeepSeek`，模型获得真实识图能力；流式回复契约不变
- 新增**模型能力路由与守卫**：供应商注册表标注每个模型的视觉能力；请求契约新增可选 `modelId`（未知标识在服务端被拒）。前端模型选择提供 **Auto（默认）与 DeepSeek 两档**：Auto 由服务端按请求内容动态选模型——消息携带图片分段时路由至视觉模型，纯文本走默认模型（按任务复杂度选模型属意图路由范畴，不在本刀）；DeepSeek 手动档显式携带注册表内的模型 id，优先于 Auto 路由；旧目录中已退役的 `deepseek-v4-flash` 条目改为现役名 `deepseek-flash`。显式指定非视觉模型且历史带图时，守卫将图片分段降级为 `[图片]` 文本占位且流正常完成（报错会让携带历史图片的后续轮次永久失败，会话卡死）
- 图片生命周期为**内联即弃**：base64 随消息驻留前端内存，会话结束自然消散；不接 Supabase Storage，不建上传/清理链路；每条消息最多 4 张（假设记录：用户未明确答复张数，取行业常见档位）

## Capabilities

### New Capabilities

（无——图片输入是既有聊天交互能力的延伸，不引入新能力域）

### Modified Capabilities

- `agent-chat`：新增图片输入要求——粘贴/文件选择入口、附件卡片交互、压缩防御的可见行为、含附件消息的发送门槛与顺序保护、气泡内图片渲染
- `ai-chat-stream`：请求契约要求变更——消息 `content` 支持分段数组且 `image_url` 段限 user 消息；编排透传要求变更——image 段到达模型

## Impact

- **packages/types**：`chat-stream.ts` 请求 schema 升级（content 分段 + image 段校验 + 可选 modelId），事件契约不动
- **apps/server**：`graph/run-chat-turn` 消息构造支持分段映射与视觉能力守卫；`model-provider` 注册表 models 升级为带能力标注的结构；chat 模块零改动
- **apps/desktop**：`TaskComposer.vue`（paste 监听 + 文件选择 + 附件卡）、`ChatMessageList.vue`（气泡图片渲染）、`useAgentChat.ts`（分段历史构造）、`types/chat.ts`（消息图片字段）、新增压缩工具函数
- **层依赖**：types ← server/desktop 单向消费，维持既有 `chat → graph → model-provider` 方向，不新增跨层依赖
- **不触及**：harness 资产（`.trae/`、`.agents/` 规则文件）、数据库 schema、新依赖、存储设施；按仓库规约随变更附 Agent Note
