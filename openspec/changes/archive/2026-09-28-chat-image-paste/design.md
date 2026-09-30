# 设计：聊天图片输入（Coze 式粘贴）

## Context

流式聊天主链已落地（`POST /chat/stream` + ChatStreamEvent 契约 + `chat → graph → model-provider` 单向分层，见 `.agents/notes/implemented/feature/2026-09-28-ai-chat-stream-mvp.md`）。消息历史由前端全量携带、服务端严格无状态；`TaskComposer.vue` 的 `+` 按钮当前为无行为的占位；前端消息类型 `ChatMessage` 仅有 `text` 字段。供应商侧 `deepseek-flash` 原生支持图片输入（OpenAI 兼容 content 分段；图片仅限 user 消息；内联 data URL 计入 48 MiB 请求体；模型内部将图片缩至约 800×800 处理）。

## Goals / Non-Goals

**Goals:**

- 端到端识图：粘贴/选图 → 压缩 → 分段契约 → 模型看图 → 气泡渲染
- 压缩管线驯服任意大图，每层异常有明确用户出口
- 零新依赖、零存储设施、零清理链路

**Non-Goals:**

- 不接 Supabase Storage / 任何对象存储（用户拍板"用完即丢"）
- 不做图片持久化（H1 落库时的图片策略另议，倾向占位符）
- 不做上传进度/断点续传/多端同步
- 不动事件契约（回复侧仍为纯文本流）

## Decisions

### D1 图片以 base64 data URL 内联，不接存储

两轮探索后的终审结论（用户拍板）：图片是一次性消耗品——H1 落库时倾向只存占位符，故 Storage 的持久化价值不成立；剩余差异仅请求体大小，localhost 场景无感；且文件桶无自动 TTL，清理链本身就是隐藏成本。契约 image 段的 `url` 字段天然兼容 data URL 与 https URL，未来若需 Storage 迁移不改契约。备选（Storage 直传 / 上传+内联兜底）已否决，理由存档于本次探索对话。

### D2 契约分段形态：string 与分段数组并存

`content: z.union([z.string(), z.array(contentPartSchema)])`。纯文本消息保持字符串形态零迁移；含图消息用分段数组。分段对齐供应商 OpenAI 兼容形态：`{ type: 'text', text }` 与 `{ type: 'image_url', imageUrl: { url } }`（camelCase 对齐本仓 zod 风格，序列化键由映射层转换）。`image_url.url` 以正则限定 `data:image/(jpeg|png|gif|webp);base64,` 前缀；"image 段仅 user 消息"在 schema 层按 role 校验拒绝（ApiErrorEnvelope，流建立前）。事件契约与 SSE 帧格式不动。请求契约同时新增可选 `modelId` 字段（未知标识服务端拒答）——模型切换能力在契约与服务端就位；前端提供 **Auto（默认）与 DeepSeek 两档**：Auto 不携带 modelId，由服务端按请求内容动态选模型（含 image 分段路由至视觉模型，纯文本走默认模型）；DeepSeek 手动档携带注册表现役 id `deepseek-flash`，显式选择优先于 Auto 路由。按任务复杂度选模型属意图路由范畴，本刀只做能力匹配路由。

### D3 压缩管线：一次解码 + drawImage 降采样

`createImageBitmap(file)` 单次解码 → 按原图尺寸计算目标（长边 1024 等比）→ `canvas.drawImage(bitmap, 0, 0, tw, th)` → `bitmap.close()` 即时释放 → `canvas.toBlob('image/jpeg', q)`。备选的"createImageBitmap resize 选项"需要先解码一次拿尺寸（两次解码，大图内存尖峰翻倍），否决；"分步 half 缩小"质量更优但代码翻倍，先不做（风险见下）。产物 blob 经 FileReader 转 data URL——渲染与契约同源，零 objectURL 生命周期管理。

### D4 质量循环与 GIF 取舍

toBlob JPEG q0.85 → 产物 >1MB 则 q0.7 → q0.6 → 仍超拒绝（toast）。GIF 一律走同一压缩管线（`createImageBitmap` 自然取首帧转 JPEG）：单一路径代码最少，且模型侧看到的本就是静态图；代价是 GIF 动画不保留——明确取舍，未来如需"小 GIF 原样内联"再加分支。

### D5 前端状态与渲染

`ChatMessage` 增加 `images?: string[]`（data URL，渲染与契约同源）。`TaskComposer` 持有 `attachments` 局部状态（id/dataUrl/name/format/bytes），`send` emit 载荷扩展为 `(text, images)`；`useAgentChat` 的 `toHistory` 把 images 转 image_url 段。气泡渲染直接 `<img>`（内存态，无需懒加载/占位图）。

### D6 服务端映射点唯一：run-chat-turn

graph 层消息构造处将契约分段映射为 LangChain content blocks（text 段 → `{type:'text'}`；image_url 段 → `{type:'image_url', image_url:{url}}`），ChatDeepSeek 的 OpenAI 兼容层原生透传。chat 模块、事件映射器零改动；`verify:invariants` 的 langchain 目录门禁不受影响（仅 graph/\*\* 引入 langchain 类型）。

### D7 防御链参数

入口：原始文件 ≤25MB、格式白名单 JPEG/PNG/GIF/WebP、每条消息 ≤4 张（用户未明确答复，按行业常见档位假设，改一个常量即可）。压缩目标：长边 1024、产物 ≤1MB。最坏请求体：4 × 1MB → base64 约 5.4MB，为供应商 48 MiB 限制的 1/9。

### D8 历史回放携带全量图片

多轮上下文为前端全量重发，历史中的 data URL 每轮随请求重传。接受理由：localhost 传输无感、每图模型侧 token 上限约 384、会话生命周期本就短暂。H1 持久化时改为占位符（另起变更）。

### D9 模型能力守卫：注册表标注 + graph 层降级

视觉能力不是全模型通用（官方确认：`deepseek-flash` 原生多模态，`deepseek-v4-pro` 为纯文本模型，同供应商内切换即触发），编排必须在契约与模型之间做能力适配。形态上不是 NestJS Middleware（那是 HTTP 层概念），而是消息构造管线内的纯函数守卫：

- `model-provider` 注册表 `models` 从 `string[]` 升级为 `{ id: string; vision: boolean }[]`（flash=true，v4-pro=false），`findModelProvider` 调用方同步
- `run-chat-turn` 依据当前模型的 `vision` 能力分流：视觉模型透传 image 段；非视觉模型将 image 段替换为 `[图片]` 文本占位段
- Auto 路由：请求未携带 `modelId` 时按请求内容选模型——消息含 image 分段 → 注册表中 vision=true 的模型；纯文本 → 供应商默认模型；显式 `modelId` 优先于 Auto 路由。守卫与路由是同一注册表能力的两个方向：路由"选对模型"，守卫"兜住选错的模型"
- 未注册的 `modelId` 在请求校验层（schema + 注册表校验）以 ApiErrorEnvelope 拒绝
- 前端模型目录两档：`Auto`（默认）与 `DeepSeek`（id `deepseek-flash`）；旧条目 `deepseek-v4-flash` 为已退役模型名，随本刀更正为现役名。Auto 不发 modelId，DeepSeek 档经 emit → 页面 → sendMessage 透传 modelId 入请求体；模型选择仍为组件局部状态（离开页面重置，沿用现状），持久化待用户提出再做

降级策略的唯一性论证：多轮上下文为前端全量重发，历史中的图片分段永远在场——若守卫选择报错，用户发过一次图后切到纯文本模型，后续所有轮次全部失败，会话永久卡死；降级为占位是对话可继续的唯一选择。备选（流内 error 事件 / 自动切换到视觉模型）均否决：前者卡死会话，后者是不透明的魔法行为。

## Risks / Trade-offs

- [超大图解码内存尖峰（25MB PNG 可达数百 MB 位图）] → 入口 25MB 拦截 + `bitmap.close()` 即时释放 + 解码失败走兜底 toast；不追加 worker/流式解码（MVP 过度工程）
- [drawImage 一步缩小的画质] → 截图/照片场景可接受；OCR 极小文字场景如反馈不佳，后续加 step-down（局部改动）
- [GIF 动画丢失] → D4 明确取舍；模型侧本为静态输入
- [data URL 历史重发放大请求体] → D8 论证接受；H1 时收敛
- [契约 BREAKING] → 前后端同仓同步发布，无外部 API 消费者
- [压缩在主线程执行可能顿挫] → 全异步 API，1024 目标实测 <500ms；不上 Web Worker
- [非视觉模型下图片信息损失（模型只见占位符）] → D9 论证为唯一可行降级；前端模型下拉标注视觉能力，降低误切概率

## Migration Plan

无存量数据与部署序列问题：桌面应用自带前后端同进程发布，契约变更随版本整体生效；回滚即回退版本。

## Open Questions

（无——张数 4 与压缩参数均为常量级假设，review 时可改，不影响结构与任务分解）
