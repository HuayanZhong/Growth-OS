---
alwaysApply: false
description: 样式冲突预防规则（Vue 3 + Tailwind CSS v4 + daisyUI 5）：外部覆盖组件样式走 class 透传 + cn() 合并，禁止 !important 与页面硬编码 data-theme。组件样式被覆盖、主题切换导致样式漂移时使用。
---

# 样式冲突预防

**适用场景**：外部覆盖组件默认样式；样式被意外覆盖；主题切换后样式异常。

**要点**：

1. 禁止业务代码 `!important`；外部覆盖默认类经 `cn()` 合并、后到者覆盖（机制见 [reuse.md](reuse.md)）。
2. 页面根不硬编码 `data-theme`，主题切换统一走全局 `theme-controller`（见 [themes.md](themes.md)）。
3. 避免依赖 DOM 结构的选择器，保持样式与结构解耦。
4. 改主题后检查前景/背景对比度（light 与 dark 下均需可读）。

**示例**：

```vue
<!-- 错误 -->
<div data-theme="dark">
  <button class="btn btn-primary bg-red-500!">登录</button>
</div>
<!-- 正确：覆盖类经 cn 合并，主题交全局 -->
<Button class="w-full">登录</Button>
```

**验证**：

```bash
# 业务代码不应出现 !important 与 data-theme 硬编码
rg -n '!important|data-theme' --glob '*.vue' apps packages
```
