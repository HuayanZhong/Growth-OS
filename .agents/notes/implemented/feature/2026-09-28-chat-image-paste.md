# 2026-09-28 · chat-image-paste（thin pointer）

图片输入端到端：Ctrl+V/文件选择 → 前端压缩（长边 1024，≤1MB）→ base64 内联分段契约（image 段限 user 消息）→ graph 按模型视觉能力路由/降级 → deepseek-flash 真识图 → 气泡图文混排；模型目录 Auto（服务端按内容路由）+ DeepSeek 手动档；会话中切模型插分割线（元信息不进历史）。决策记录与实现细节见 [design.md](../../../../openspec/changes/archive/2026-09-28-chat-image-paste/design.md)。

- Change: [2026-09-28-chat-image-paste](../../../../openspec/changes/archive/2026-09-28-chat-image-paste/)
- Specs: [agent-chat](../../../../openspec/specs/agent-chat/spec.md)（图片输入/发送渲染/分割线）、[ai-chat-stream](../../../../openspec/specs/ai-chat-stream/spec.md)（分段契约/Auto 路由与守卫）
- 验证：服务端 curl 真图识图四用例 + 浏览器 Playwright 全链路（登录→入卡→发送→回复含图中数字）+ 全仓 test/typecheck/lint/verify/hygiene 绿
