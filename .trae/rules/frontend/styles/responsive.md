---
alwaysApply: false
description: 响应式样式规则（Tailwind CSS v4 + daisyUI 5）：移动优先、断点逐级增强，页面布局用自适应容器，daisyUI size 类不加断点前缀。适配不同窗口尺寸、处理断点与交互区域大小时使用。
---

# 响应式样式

**适用场景**：布局适配不同窗口尺寸、使用断点。

**要点**：

1. 基础类描述移动端，`sm:`/`md:`/`lg:` 逐级增强。
2. 页面布局用 daisyUI 自适应容器（`hero`/`hero-content`、`card`），宽度用 `max-w-*` + `w-full`，不写死像素。
3. daisyUI size 类（`btn-lg`、`input-lg` 等）**不能加断点前缀**；需要变尺寸时用标准尺寸类或按断点换形态。
4. 图标用 Tailwind 尺寸类（`h-4 w-4`），不写死 SVG 宽高。
5. 交互元素最小可点区域不小于 40px。

**示例**：

```vue
<!-- 错误 -->
<div class="w-96"><input class="input input-lg w-full" /></div>
<!-- 正确 -->
<div class="hero min-h-screen">
  <div class="hero-content w-full max-w-sm flex-col">
    <input class="input w-full" />
  </div>
</div>
```

**验证**：

```bash
# size 类不应出现断点前缀
rg -n '(btn|input|select)-(lg|sm|xs):(sm|md|lg|xl)' --glob '*.vue' apps packages
# 窗口缩至窄屏与宽屏，无横向滚动条
```
