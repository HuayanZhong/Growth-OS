---
alwaysApply: false
description: 主题切换规则（daisyUI 5）：主题在 CSS 显式启用，切换控件用 theme-controller 全局生效，页面不锁 data-theme，默认主题用 --default 标记。实现明暗切换、多主题时使用。
---

# 主题切换

**适用场景**：明暗切换、多主题（light/dark 等）。

**要点**：

1. 主题在 UI 包 CSS 的 `@plugin "daisyui" { themes: ... }` 显式启用，未启用主题名无效。
2. 切换控件用 `theme-controller`（隐藏 checkbox/radio），机制全局，控件位置不限。
3. 默认主题用 `--default` 标记；不用 `--prefersdark`（跟随系统会致切换"看似无效"）。
4. 页面根不硬编码 `data-theme`（会覆盖全局切换）；页面内只保留一个主题入口（多个 `theme-controller` 的 `:root:has()` 规则会互相覆盖）。

**示例**：

```css
@plugin "daisyui" {
  themes: light --default, dark, cupcake;
}
```

```vue
<label class="swap swap-rotate">
  <input type="checkbox" class="theme-controller" value="dark" />
  <svg class="swap-off h-6 w-6 fill-current"><!-- 太阳 --></svg>
  <svg class="swap-on h-6 w-6 fill-current"><!-- 月亮 --></svg>
</label>
```

**验证**：

```bash
# 从应用目录执行；-g 匹配 CSS 产物，避免 PowerShell 把 < > 当重定向
rg -n 'theme-controller\[value=' -g '*.css' .output
# 浏览器实测：默认主题 ↔ 切换主题 双向生效
```
