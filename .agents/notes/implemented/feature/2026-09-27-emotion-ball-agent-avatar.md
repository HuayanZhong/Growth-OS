# Agent Note: 新任务页集成 Emotion Ball 动态表情小球

Status: implemented

## Problem

新任务页（`apps/desktop/app/pages/dashboard/tasks/new.vue`）需要一个 AI 形象。用户指定使用 [sam70361/aora-bot](https://github.com/sam70361/aora-bot) 的 Emotion Ball（`aithena.github.io/emotion-ball` 展示页为其 fork），作为 Agent 选择条胶囊中的 Agent 图标，要求动态渲染而非静态图。

## Decision

- 引擎 4 个 IIFE 全局脚本（`rings.js` 几何数据 / `emotions.js` 表情数据 / `ball.js` 渲染 / `engine.js` 驱动）vendor 到 `apps/desktop/public/emotion-ball/`，不做代码改动，保持可对照上游。
- `app/components/EmotionBall.vue` 封装：客户端按依赖顺序从 `public/` 注入脚本（模块级 Promise 缓存，多实例共享），`onMounted` 调 `EmotionBall.create(el, { emotion, idle: true })`，watch `emotion` prop 调 `setEmotion`，卸载时 `destroy()`；加载失败降级为空占位。
- 小球是默认 Agent「小花颜」的头像：新任务页 / Agent 任务开场页的胶囊内（`h-5 w-5`）、AGENTS 侧边栏树子项（`h-5 w-5`）、Agent 开场页标题内嵌（`h-8 w-8`），均为 `<EmotionBall emotion="02" />`（待机放空）。
- 许可：Emotion Ball Community License——非商业免费使用须注明出处；引擎与表情数据可另行商业授权；**球形角色视觉形象永不商用**。组件文件头与上游文件头均注明来源；本项目按非商业使用集成，若 Growth OS 未来商用，必须移除该视觉形象或取得授权（引擎可谈，形象不可谈）。
- lint 对 vendored 目录整体忽略（`.oxlintrc.json` `ignorePatterns` 增加 `**/public/emotion-ball/**`），上游代码不做风格化修改。

## Alternatives considered

- 仅提取静态 SVG（用户最初倾向）：已验证可行（渲染一帧后 outerHTML 仅 ~3.8KB），但用户随后明确要动态版；且静态快照的眼睛姿态依赖鼠标位置，需要额外处理，灵活性远不如直接集成引擎。
- npm 依赖 `ai-orb`（搜索中的相似项目）：状态只有 6 种且不做卡通脸，与用户指定的 32 态表情球不符。
- 引擎源码改造为 ES Module 进构建：侵入上游代码、增加后续对照更新成本；IIFE + `public/` 脚本注入零改动即可工作，桌面端（非网络分发场景）无需按需加载优化。

## Consequences

- `public/emotion-ball/` 约 120KB 静态资源随构建打包；运行时挂在 `window.EmotionBall`，与组件名 `EmotionBall` 无冲突（不同作用域）。
- 商业化前必须处理许可（见 Decision），该约束同时记录在组件文件头注释中。
- 任务功能落地后，可通过 `handleAIMessage({ emotionId, tips })` 驱动小球状态（思考中 30 / 完成 33 / 出错 34 等）。
