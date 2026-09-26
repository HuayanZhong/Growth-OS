# Agent Note: ThemeToggle 主题选择持久化

Status: implemented

## Problem

`ThemeToggle`（packages/ui）依赖 daisyUI `theme-controller` 的纯 CSS 机制（`:has(:checked)`）切换明暗，刷新后复选框回到未勾选，主题总是回落到日间。

## Decision

- 持久化自包含在 `ThemeToggle.vue` 内：change 时把 `dark`/`light` 写入 `localStorage`（key：`growth-os-theme`），`onMounted` 时恢复勾选态，并同步 `<html data-theme>`（dark 设属性、light **移除属性**交回 `--default`，遵守 themes.md 不在根上锁主题）。
- 两个机制并存且一致：`data-theme` 属性 + `:has(:checked)`，恢复时同步设置避免状态分裂。

## Alternatives considered

- 提取 `useTheme` 组合式放进 desktop：主题切换是 Toggle 自身职责，拆出去反而让组件不可自足；且 ui 包不依赖 Nuxt 组合式生态。
- `app.head` 注入内联脚本在渲染前应用主题：可消除暗色刷新的首帧闪烁，但 Electron 刷新场景影响极小，先保持最小实现；若日后在意首帧再补。
- 数据写死只存布尔：存 `dark`/`light` 字符串，为未来 cupcake 等多主题扩展留位（main.css 已启用 cupcake）。

## Consequences

- 行为变更在 ui 包内，desktop 无需改动（`app-sidebar` 引用处无 props 变化）。
- 已知限制：恢复发生在组件挂载后，暗色用户刷新有短暂亮色首帧；在意时可用内联脚本方案替换。
