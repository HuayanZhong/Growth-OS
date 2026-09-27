# Tasks: add-agent-create-modal

## 1. Agent 目录响应式化（地基）

- [x] 1.1 新建 `apps/desktop/app/composables/useAgents.ts`：迁移 `AgentEntry` 类型与内置 seed；新增策展常量 `AGENT_AVATAR_OPTIONS`（约 12 个，以情绪反应组为主，注明来自 `public/emotion-ball/emotions.js` 的 ID 契约）；模块级 `ref` 单例 + `createAgent()`（slug = `agent-` + `crypto.randomUUID()` 前 8 位、冲突重生成、`isDefault: false`、追加后持久化）+ `getAgent` / `getDefaultAgent`；持久化读写以可注入 Storage 参数实现（键 `growth-os-agents`，只写自定义 Agent），解析失败静默回退内置目录。验证：新增 `test/unit/use-agents.test.ts`（unit 项目无 `~` 别名用相对路径；覆盖创建追加、同名多次创建 slug 唯一、写盘内容、损坏 JSON 回退、默认 Agent 保护）→ `pnpm --filter desktop exec vitest run test/unit/use-agents.test.ts`
- [x] 1.2 删除 `apps/desktop/app/utils/agents.ts`，消费点迁移到 `useAgents()`：`app-sidebar.vue`（目录遍历）、`TaskComposer.vue`（下拉遍历）、`pages/dashboard/agents/[id].vue`（`getAgent` 改从 composable 文件显式导入，顺带消除自动导入注册表遗漏个案）。验证：既有 `test/nuxt/agent-page.test.ts`、`test/nuxt/task-composer.test.ts` 全绿且无 unused 导出 → `pnpm --filter desktop test` → `pnpm --filter desktop typecheck`

## 2. 形象数据化

- [x] 2.1 替换四处硬编码 `emotion="02"`：侧边栏子项与 TaskComposer 下拉项读各自 `agent.emotion`；TaskComposer 触发器与 `[id].vue` 标题按当前 slug 从目录取 `emotion`（未命中回退默认 Agent）。验证：更新 `test/nuxt/agent-page.test.ts` 断言 EmotionBall stub 收到的 emotion prop → `pnpm --filter desktop exec vitest run test/nuxt/agent-page.test.ts`

## 3. 创建 Agent 弹窗

- [x] 3.1 新建 `apps/desktop/app/components/agents/CreateAgentModal.vue`（布局 A）：daisyUI `<dialog class="modal">` 机制；左侧大尺寸 `EmotionBall` 实时预览 + 右侧名称（必填，trim 非空控制创建按钮 disabled）/描述（可选）+ 底部 32px 动态表情网格（点选即预览、选中态高亮、默认 `'02'`）；取消 / Esc / 遮罩关闭即丢弃并重置表单；创建调 `createAgent()` 后 `navigateTo('/dashboard/agents/<slug>')`。视觉沿用 TaskComposer 设计语言（rounded-3xl 渐变面、语义令牌、共享投影层级）。验证：新增 `test/nuxt/create-agent-modal.test.ts`（打开初始态、名称空白禁用、点选表情预览切换、提交创建并路由跳转、取消不新增目录）→ `pnpm --filter desktop exec vitest run test/nuxt/create-agent-modal.test.ts`
- [x] 3.2 侧边栏接入：AGENTS 分组 ⊕ 按钮点击打开弹窗（挂载 `CreateAgentModal`）。验证：`pnpm --filter desktop typecheck`，并 `pnpm dev` 手动走通「点 ⊕ → 填名称 → 选表情 → 创建 → 跳转新开场页 → 侧边栏/下拉即时可见 → 重启后仍在」（UI 可见改动须实机确认）

## 4. 收尾

- [x] 4.1 按序全绿：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint`
- [x] 4.2 交付 thin pointer Agent Note（`.agents/notes/`，摘要 + 指向本 change；许可边界无扩大）并跑 `pnpm verify`（invariants + docs + gates）通过

## 5. 增量：表情×颜色 / 调速 / 扩展能力（用户追加，2026-09-27）

- [x] 5.1 新建 `apps/desktop/app/utils/emotionTempo.ts`：纯缩放 helper（`poolMs`/`blinkMs`/`transition` × 因子，其余字段透传，`blinkMs: null` 保持 null）；`EmotionBall.vue` 加载脚本后对 `window.EMOTION_SEED` 逐条缩放重注册（因子 0.5，单条失败 warn 跳过）。验证：新增 `test/unit/emotion-tempo.test.ts` → `pnpm --filter desktop exec vitest run test/unit/emotion-tempo.test.ts`
- [x] 5.2 目录模型扩展：`AgentEntry`/`CreateAgentInput` 加 `color?: string` 与 `capabilities?: string[]`（未选/未设不落字段）；`useAgents.ts` 导出 `AVATAR_COLOR_OPTIONS`（8 预设色）与 `AGENT_CAPABILITY_OPTIONS`（4 占位项）；单测覆盖创建透传与重启恢复。验证：更新 `test/unit/use-agents.test.ts` → `pnpm --filter desktop exec vitest run test/unit/use-agents.test.ts`
- [x] 5.3 弹窗扩展：色板行（8 色块，点选预览球实时换色——预览实例重建，选中态高亮）+ 扩展能力多选 chips；创建时携带 color/capabilities；`EmotionBall.vue` 加 `color` prop 透传 `create`。验证：更新 `test/nuxt/create-agent-modal.test.ts`（色板预览切换、能力随创建保存）→ `pnpm --filter desktop exec vitest run test/nuxt/create-agent-modal.test.ts`
- [x] 5.4 消费点透传颜色：侧边栏子项、TaskComposer 下拉项与触发器、`[id].vue` 标题均传 `:color`。验证：更新 agent-page/task-composer 测试断言 color 透传 → `pnpm --filter desktop test`
- [x] 5.5 增量收尾：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿；更新 thin pointer Note（颜色/节奏/能力三增量，vendored 零改动不变）

## 6. 增量：技能选择弹窗化（用户对标 Coze 扩展弹窗纠正，2026-09-27）

- [x] 6.1 内联面板重做为独立弹窗：新建 `app/components/agents/SkillPickerModal.vue`（嵌套 dialog：左分类栏仅技能 + 「添加技能」标题/搜索框本地过滤 + 技能卡片列表（名称/描述/添加↔移除 pending 切换）+ 取消/确定）；`skills.ts` `SKILL_LIST` 加 `description`；宿主弹窗 chip/＋ 改为打开弹窗，`confirm` 回填 `selectedSkills`。验证：更新 `test/nuxt/create-agent-modal.test.ts`（弹窗开合、搜索过滤、取消不回填、确定回填计数与创建链路）→ `pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm verify` 全绿；`pnpm dev` 实机截图确认弹窗结构与「技能 +2」回填

## 7. 增量：扩展弹窗样式对齐 Coze + 组件更名（用户纠正，2026-09-27）

- [x] 7.1 组件更名与样式重做：`SkillPickerModal` → `ExtensionPickerModal`（通用扩展选择器，本轮仅技能分类，插件/MCP 后续接入同一弹窗）；样式对齐 Coze 扩展弹窗——modal 加宽（max-w-2xl）、左栏分类选中态、「添加技能」+ 圆角搜索框、卡片改彩色图标块（`skills.ts` `SKILL_LIST` 加 `tint` 内容参数）+ 描述 + 描边添加/移除按钮、列表 hover 反馈。验证：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` 全绿；`pnpm dev` 实机截图确认新版式
- [x] 7.2 扩展能力区改整条选择框（用户对标截图纠正）：框内为淡背景类别 chip（图标 primary 着色 + 名称 + 计数，`bg-base-content/5` 自适应主题）+ 右端裸 ＋；标题去「（可选）」尾缀对齐 Coze。验证：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿；实机截图确认
- [x] 7.3 未选占位态（用户对标截图纠正）：未选择技能时选择框显示占位文案「添加扩展能力（插件、技能和 MCP）」（点击可打开弹窗），选择后回落为「技能 +N」chip；spec 补「未选择时显示占位」场景。验证：更新初始态/取消不回填用例断言 → `pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿
- [x] 7.4 弹窗质感精修（用户反馈「AI 风味太重」）：去 modal 渐变改纯 base-100；分类选中态改中性浮起（bg-base-100 + shadow-sm）去主题色块；搜索框改无边框底色胶囊；卡片图标块从单字改**线性图标**（组件内 SKILL_ICONS 路径表，tint 底恒深色）；添加/移除与取消按钮改幽灵态降存在感；字重层级收敛（medium/regular + /45 辅助色）。验证：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿；实机截图确认
- [x] 7.5 扩展能力条去 AI 味二轮（用户对标截图纠正）：实线框 + 灰底填充改**虚线无底色**（dashed = 待填充语义，对齐 Coze）；＋ 去圆角底改裸图标（text-base-content/40，hover 提亮）。验证：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿；实机截图确认
- [x] 7.6 已选 chip 打磨（用户反馈「很丑」）：底色 `bg-base-content/5`（亮色下成灰印）改语义表面色 `bg-base-200`（hover `base-300/70`）；圆角 lg→md、内边距收扁（px-2 py-0.5）、图标 3.5、gap 1——比例对齐 Coze 的紧凑 chip。验证：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿；实机截图确认
