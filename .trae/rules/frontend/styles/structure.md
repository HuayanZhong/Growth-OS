---
alwaysApply: false
description: 前端样式组织规则（Vue 3 + Tailwind CSS v4 + daisyUI 5）：组件内 class 按语义分组、禁止内联 style；样式文件分层存放的目录结构。书写组件 template class、新增样式文件或静态资源时使用。
---

# 样式组织与目录结构

## 组件内样式：按语义分组，禁止内联 style

**适用场景**：书写组件 template 的 class。

**要点**：

1. 类名按"布局 → 尺寸 → 颜色 → 状态"顺序分组排列。
2. 优先 daisyUI 官方组件类与标准工具类，不重复造轮子。
3. 禁止内联 `style`（动态尺寸等特例除外）；动态样式用 `:class` 切换语义类。
4. 单元素 class 超过 5~6 组时触发可复用抽取。

**示例**：

```vue
<!-- 错误 -->
<button class="btn btn-primary" style="width:100%; margin-top:8px">登录</button>
<!-- 正确 -->
<button type="button" class="btn btn-primary btn-block mt-2">登录</button>
```

**验证**：

```bash
rg -n 'style="' --glob '*.vue' apps packages
```

## 样式目录结构：分层存放

**适用场景**：新增全局样式、组件、静态资源时。

**要点**：

1. 全局样式（tailwind + daisyUI + 主题）只在 UI 包单一 CSS 入口（`src/styles/main.css`）；消费方入口 CSS 仅 `@import '<ui-package>/main.css'`，不重复声明。
2. UI 基础组件放 `src/components/ui/<name>/`，消费方经包名导入。
3. 页面样式随组件内联；页面专属少量全局样式放应用 `app/assets/css/`。
4. 静态资源（图标等）放 `app/assets/icons/`，经 `~/assets/icons/...` 引用，尺寸用 `h-* w-*` 覆盖。

**示例**：

```text
ui-package/src/
├── styles/main.css        # 唯一全局样式入口
├── lib/cn.ts              # 类名合并工具
└── components/ui/<name>/  # 组件 + index.ts

app/app/assets/css/main.css  # 仅 @import '<ui-package>/main.css'
```

**验证**：

```bash
# 消费方不应再有 @plugin "daisyui"（无输出即通过；rg 无匹配时退出码为 1，属正常）
rg -l '@plugin "daisyui"' apps
```
