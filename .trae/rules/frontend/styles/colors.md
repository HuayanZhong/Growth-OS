---
alwaysApply: false
description: 前端样式颜色规则（Tailwind CSS v4 + daisyUI 5）：颜色一律使用语义色令牌，禁止硬编码色值，品牌色映射语义色。为元素上色、引入品牌色时使用。
---

# 颜色

**适用场景**：为任意元素上色、引入品牌色时。

**要点**：

1. 颜色只用 daisyUI 语义令牌（`base-*`、`primary`、`info`、`success`、`neutral` 等），随主题自动切换。
2. 禁止十六进制、RGB、任意值类（`bg-[#...]`）与裸 `text-white` 等。
3. 透明度变化用令牌透明度后缀（`/60`），不另写颜色。
4. 品牌色映射语义色（如 QQ → `info`、微信 → `success`），不新增色值。

**示例**：

```vue
<!-- 错误 -->
<div class="bg-[#...] text-white">
<!-- 正确 -->
<div class="bg-base-200 text-base-content">
```

**验证**：

```bash
rg -n '#[0-9a-fA-F]{3,8}\b|(bg|text)-\[#' --glob '*.vue' --glob '*.css' apps packages
```
