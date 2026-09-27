# Design: add-agent-create-modal

## Context

现状与约束（动机见 [proposal.md](proposal.md)）：

- Agent 目录是静态常量：`apps/desktop/app/utils/agents.ts` 导出 `AGENT_LIST`（仅 `{slug, name, isDefault}`），消费方三处——侧边栏（直接遍历）、`TaskComposer.vue` 下拉（直接遍历）、`pages/dashboard/agents/[id].vue`（`getAgent(slug)`，显式 import 兜底自动导入注册表遗漏）。
- 小球表情在四处硬编码 `emotion="02"`：侧边栏子项、开场页标题、TaskComposer 触发器与下拉项。
- EmotionBall 引擎（vendored，见 Agent Note `2026-09-27-emotion-ball-agent-avatar.md`）自带 32 套表情，ID 分段即对外契约（`00-09` 生命周期 / `10-29` 情绪反应 / `30-49` 代理工作状态，头注释声明「编号不可重排」）；`window.EMOTION_SEED` / `EMOTION_GROUPS` 为脚本加载后的运行时全局。
- 应用 `ssr: false`（SPA），无水合顾虑；模块级单例状态天然只活在客户端。
- 项目无 Pinia，状态管理走 composables 模式；已有 daisyUI `<dialog class="modal">` 弹窗先例（退出登录确认）与 localStorage 持久化先例（`growth-os-theme`，见 Agent Note `2026-09-27-theme-toggle-persistence.md`）。

## Goals / Non-Goals

**Goals:**

- 布局 A 弹窗：左动态预览 + 右名称/描述表单 + 底部表情网格（用户已拍板）。
- 目录响应式化：新建 Agent 即时反映到侧边栏、下拉、路由，并持久化 localStorage。
- 形象数据化：四处硬编码表情改为读 Agent 数据。
- 数据结构贴近未来服务端模型，迁移成本低。

**Non-Goals:**

- Agent 编辑 / 删除（后续 change）。
- 服务端落地与目录上云（后端阶段处理，见 Migration Plan）。
- 表情策展清单与 `emotions.js` 的自动同步（策展是人工决定，见 Decisions 4）。
- 弹窗内上传图片头像（Coze 有此能力；本项目以表情球为唯一形象来源）。

## Decisions

1. **状态管理：composable 模块级单例，不引 Pinia。** 目录逻辑与数据从 `utils/agents.ts` 整体迁移到 `app/composables/useAgents.ts`（`ref` 单例 + `createAgent(input)` + `getAgent(slug)` / `getDefaultAgent()` 保持既有函数语义，内部读单例故在 computed/render 中仍具响应性），删除 `utils/agents.ts`，消费点全部改走新入口。备选：Pinia（新增依赖与样板，违背最小改动）；保留 utils 纯函数（无响应性，无法满足「创建后即时可见」）。

2. **持久化：localStorage 键 `growth-os-agents`，只写自定义 Agent。** 加载时合并策略 = 内置 seed + 已存自定义项；内置目录永不写盘，避免上游演进时被陈旧快照遮蔽。解析失败或结构不符 → 静默丢弃、回退仅内置目录。键名沿用 `growth-os-*` 前缀约定（同 `growth-os-theme`）。备选：全量快照写盘（内置目录更新会被旧数据遮蔽，弃）；useSecureStorage（规则限定只存敏感数据，Agent 目录非敏感，弃）。

3. **slug：`agent-` + `crypto.randomUUID()` 截取 8 位。** Web Crypto 浏览器原生，零新依赖；不与现有 slug 冲突（冲突则重生成）。备选：pinyin 转换（引入 `pinyin-pro` 依赖，且 URL 命名不该由中文名决定）；用户自填英文 slug（把复杂度推给用户，Coze 亦不让用户管 URL）。

4. **表情候选：TS 策展常量 `AGENT_AVATAR_OPTIONS`（约 12 个，以「情绪反应」组为主）。** 不读 `window.EMOTION_SEED`——它依赖脚本加载时序，且 32 套中「睡眠」「失落」等不宜作头像，策展本就是筛选。TS 清单与 `emotions.js` 是有意的策展副本而非同步复制；上游 ID 契约稳定（不可重排），漂移风险可控。默认选中 `'02'`（待机，与现状一致）。

5. **弹窗：daisyUI dialog modal + 独立组件 `app/components/agents/CreateAgentModal.vue`。** 与退出登录弹窗同机制（`showModal()` / `close()`、backdrop form 提交关闭）；视觉沿用 TaskComposer 的设计语言（`rounded-3xl` 渐变面、共享投影层级、语义令牌）。备选：内联 app-sidebar（该文件已 312 行，弹窗含网格逻辑会显著膨胀，独立组件利于测试与复用）。

6. **创建后导航：目录更新与 `navigateTo('/dashboard/agents/<slug>')` 在同一同步流程内完成**，先追加目录再路由，`[id].vue` 的 `getAgent` 即刻命中，不出现 404 闪断。

7. **网格性能：全部候选项以小尺寸（32px）动态渲染。** EmotionBall 脚本模块级 Promise 缓存，弹窗内多实例共享同一引擎；SVG 属性插值开销小，Electron 桌面端可接受。备选：仅选中项动态 / hover 激活（交互割裂，作为实测不达标时的降级预案）。

8. **颜色：引擎原生参数 + 预设色板。** 引擎 `create` 支持 `color`（身体）/`eyeColor`（眼白，默认纯白）选项（`_theme` 每帧覆盖姿态色），`EmotionBall` 增加 `color` prop 透传；`AgentEntry.color` 可选，未设置即引擎默认米白。色板 8 个预设色（奶油/樱粉/杏黄/柠檬/雾蓝/藕紫/薄荷/珊瑚，硬编码 hex 属角色画布参数而非 UI 语义色，不违反颜色规则）。预览球颜色变更通过重建实例实现（引擎无运行时换色 API）。备选：改 vendored 代码加 setTheme（破坏零改动原则，弃）。

9. **调速：公开 SDK 重注册，上游零改动。** 引擎无全局速度选项，但 `EmotionBall.config.register` 同 ID 重注册会覆盖定义（`registry.set`）；脚本加载完成后对 `window.EMOTION_SEED` 逐条缩放 `poolMs`/`blinkMs`/`transition`（倍率 0.5，封装常量）后重注册，纯缩放 helper 独立成 `app/utils/emotionTempo.ts` 便于单测。引擎 `validate` 仅校验 id/name/group/anims/sequence，数值缩放无门槛；单条失败静默跳过。备选：改 vendored 代码（破坏零改动，弃）；monkey-patch rAF 时钟（影响所有动画相位，风险大，弃）。

10. **扩展能力：仅技能一类，弹窗式选择器（对标 Coze 扩展弹窗）。** Coze 的扩展能力是「技能/插件/连接器」分类 chips + 独立「扩展」弹窗；本项目只需技能：`AgentEntry.skills?: string[]`，扩展能力区为「技能 chip（+N 计数）+ ＋ 按钮」，点击打开独立**扩展**选择弹窗（`app/components/agents/ExtensionPickerModal.vue`，组件按通用扩展选择器命名而非 SkillPicker——插件/MCP 后续接入同一弹窗，当前仅技能分类；嵌套 dialog 叠加于创建弹窗之上）——左分类栏仅技能一项 + 右侧「添加技能」标题/圆角搜索框（本地过滤）/技能卡片列表（**彩色图标块**（目录 `tint` 内容参数，pastel 浅底恒深字，不随主题翻转，同头像色板先例）+ 名称/描述 + 添加↔移除描边按钮即时切换 pending），点「确定」回填宿主表单、取消/Esc 丢弃（Coze 无确定为即时生效，用户明确要求确定步骤，从用户）。技能目录 `app/utils/skills.ts` `SKILL_LIST`（含 description/tint，静态占位，技能页将来共用同源）。数据字段保持 `skills`（当前确实只存技能 ID）；后续接入 MCP 时的字段演进（并列 `mcps` 或升级结构化 `extensions`）由后端阶段定。备选：组件按内容命名 SkillPickerModal（用户纠正：弹窗是通用扩展选择器，弃）；内联展开面板（用户纠正：须弹窗式，弃）；Coze 式即时生效无确定（用户要求确定步骤，弃）；本轮做插件/MCP/连接器分类（无对应体系，过度设计，弃）。

## Risks / Trade-offs

- [网格十余个动态球实例同时动画] → 固定小尺寸 + 引擎单例共享；实测掉帧再降级为「hover/选中激活动画」（Decisions 7）。
- [TS 策展清单与 `emotions.js` 双源漂移] → 上游声明 ID 编号即契约不可重排；清单处注明来源与核对时机（上游升级时人工核对）。
- [节奏重注册与上游表情升级冲突] → tempo helper 只缩放 `poolMs`/`blinkMs`/`transition` 三个已知字段、其余原样透传；单条注册失败静默跳过并 console.warn（Decisions 9）。
- [localStorage 数据损坏] → 解析失败静默回退内置目录（spec 已覆盖该场景），不影响可用性。
- [创建即跳转的时序] → Decisions 6 的同步顺序保证；`getAgent` 响应式读单例。
- [Emotion Ball 许可] → 本变更不扩大使用范围（仍是 Agent 头像），约束维持 Agent Note `2026-09-27-emotion-ball-agent-avatar.md` 现状（非商业使用；商用须移除形象或授权）。

## Migration Plan

纯前端 change，无部署迁移。后续服务端落地时：`AgentEntry`（含 `emotion`/`description`）即未来 API payload 蓝本，`growth-os-agents` 本地数据届时经「同步/导入」流程收编；回滚仅需 revert，残留的 localStorage 键无害。

## Open Questions

- 表情策展清单的具体成员：实现时按 `emotions.js` 中文名现场挑选（候选池：`10` 开心、`02` 待机、`11` 疑惑等），不影响规格与任务拆分。
