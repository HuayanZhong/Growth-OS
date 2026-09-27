# Agent Note: agent-chat-dock-transition（agent 页会话停靠与输入框位移动画）

Status: implemented

OpenSpec change：[agent-chat-dock-transition](../../../../openspec/changes/archive/2026-09-27-agent-chat-dock-transition/proposal.md)（完整决策与备选在该 change 的 proposal/design，已归档）。

Agent 页升级为 hero（开场）/ chat（会话停靠）双态：hero 态发送时 TaskComposer 的 DOM 节点全程存活，经 GSAP Flip 从居中滑落停靠到底部（问候语淡出 → 翻转 phase → Flip.from + 消息流淡入）；chat 态顶部为固定顶栏（agent 名 + 在线，点击名字弹出 Agent 信息卡：大头像 / 名称 / 「AI Agent · 在线」/ 已开启技能标签；无发消息/新项目按钮与渠道区块）+ 消息流（顶部「对话由AI生成」声明与 M-DD 日期分割线，消息带 `createdAt`；每条消息带头像 + 名称身份行，agent 加「AI」徽章，用户头像为邮箱首字符）；会话按 slug 存于内存（`useAgentChat` 单例，重启即失，agent 回复为 typing 打字指示静态占位、零网络）；新任务页发送改为 `stagePending` + 跳转，agent 页 `consumePending` 命中直接以 chat 态挂载。GSAP Flip 插件注册收拢进 `useGsapTransition` 模块加载（frontend-motion ADDED 需求）。TaskComposer 新增 `showAgentSelector` 开关（chat 态隐藏 agent 选择垫层，切 agent 走侧边栏），宽度策略外移到使用方：开场页 `max-w-3xl` 居中、会话态撑满钉底。收尾发现的 harness 摩擦（保存 hook oxfmt 配置冲突、MotionTarget 类型放行 ref 对象）已记入 [backlog-decay-audit](../../backlog-decay-audit.md)。
