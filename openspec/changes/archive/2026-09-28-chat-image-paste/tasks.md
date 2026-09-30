## 1. 契约升级（packages/types）

- [x] 1.1 升级 `packages/types/src/ai/chat-stream.ts`：`content` 支持纯字符串或分段数组（`text` / `image_url` 段），`image_url.url` 限定 base64 图片 data URL 前缀，`image_url` 段仅允许 user 消息（违反时 schema 校验失败）；请求新增可选 `modelId` 字段；导出分段类型，事件契约与帧编解码不动；随后跑 `pnpm typecheck` 确认两侧消费方类型指引完整

## 2. 服务端映射、能力守卫与校验（apps/server）

- [x] 2.1 `model-provider` 注册表 `models` 升级为 `{ id: string; vision: boolean }[]`（flash=true，v4-pro=false），`findModelProvider` 及既有调用方同步适配；验证 `pnpm --filter server test`
- [x] 2.2 `graph/run-chat-turn` 消息构造支持分段：user 消息分段数组按当前模型视觉能力映射——视觉模型转 LangChain content blocks（text/image_url 1:1），非视觉模型 image 段替换为 `[图片]` 文本占位段；字符串消息路径不变；Auto 路由：未携带 `modelId` 时按请求内容选模型（消息含 image 分段选注册表视觉模型，纯文本走默认模型），显式 `modelId` 优先，factory 按 modelId 创建；验证 `pnpm --filter server test`
- [x] 2.3 补服务端测试：含图分段消息在视觉模型下正确构造 blocks；非视觉模型下 image 段降级为占位且流正常完成；Auto 含图请求路由至视觉模型、Auto 纯文本走默认模型；assistant 消息携带 image 段、非法 data URL、未注册 `modelId` 均被请求校验以 ApiErrorEnvelope 拒绝且不建立流；验证 `pnpm --filter server test` 与 `pnpm --filter server typecheck`

## 3. 前端压缩管线（apps/desktop）

- [x] 3.1 新增 `app/utils/image-compress.ts`：白名单与 25MB 入口拦截 → `createImageBitmap` 解码 → drawImage 等比缩至长边 1024 → `toBlob` JPEG 质量循环（0.85/0.7/0.6，产物 ≤1MB）→ data URL；GIF 取首帧；拒绝分支返回机器可读原因；尺寸计算与质量决策抽为可注入的纯逻辑以便 node 环境单测；验证 `pnpm --filter desktop exec vitest run test/unit/image-compress.test.ts`
- [x] 3.2 补压缩单测：大小/格式拒绝、小图不放大、质量循环命中、GIF 首帧、损坏输入兜底；验证 `pnpm --filter desktop exec vitest run test/unit/image-compress.test.ts`

## 4. 前端输入交互与渲染（apps/desktop）

- [x] 4.1 `TaskComposer.vue`：textarea `onPaste` 拦截剪贴板图片、`+` 按钮打开文件选择器（accept 白名单）、附件卡片状态与 UI（缩略图/自动生成文件名/格式标签/删除/上限 4 张）、`send` emit 扩展为 `(text, images)`、`canSend` 纳入附件；文本粘贴行为不变；验证 `pnpm --filter desktop test`
- [x] 4.2 `useAgentChat.ts` 与 `app/types/chat.ts`：`ChatMessage` 增加 `images` 字段，发送链路接受 images 并构造分段历史（data URL 直接作为 image_url 段），生成中忽略保护覆盖含图发送；验证 `pnpm --filter desktop exec vitest run test/nuxt/use-agent-chat.test.ts`
- [x] 4.3 `ChatMessageList.vue` 气泡图文混排渲染（有图必有卡片式图片，文本可空）；页面接线跟随新 emit 签名（agent 页与新任务页）；`app/utils/models.ts` 目录为 `Auto`（默认）+ `DeepSeek`（现役 id `deepseek-flash`，替换已退役的 `deepseek-v4-flash` 条目）两档，Auto 不携带 `modelId`、手动档经 emit/sendMessage/请求体透传；验证 `pnpm --filter desktop test`
- [ ] 4.4 模型切换分割线：`ChatMessage` 增加 `divider` kind，`useAgentChat` 增加 `insertModelDivider`（chat 态且模型实际变化才插入、记 `session.currentModelId`、typing 占位不入历史同规），`TaskComposer` 模型选择 emit `model-change`，agent 页接线，`ChatMessageList` 居中分割线渲染；验证 `pnpm --filter desktop test`

## 5. 全链验证与收尾

- [x] 5.1 端到端手动验证：运行应用粘贴真实截图，确认附件卡片、发送、AI 识图回复（引用图片实际内容）、追问仍可引用先前图片；超大图与损坏图得到拒绝提示；验证方式：`pnpm dev` 打开 agent 会话操作观察
- [x] 5.2 全仓验证：`pnpm test` → `pnpm typecheck` → `pnpm lint` 全绿
- [x] 5.3 `pnpm verify` 与 `pnpm hygiene` 全绿（invariants 含 langchain 目录门禁）
- [x] 5.4 归档后补 Agent Note（thin pointer，`.agents/notes/implemented/feature/`，链接归档目录）
