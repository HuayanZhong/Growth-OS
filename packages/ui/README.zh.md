# @growth-os/ui

[English](README.md) | 中文

基于 Tailwind CSS v4 + daisyUI 5 的设计系统组件与样式，架构参考 shadcn（组件目录 / `cn()` 工具 / barrel 导出）。

## 导出

| 路径                                  | 用途                                |
| ------------------------------------- | ----------------------------------- |
| `.`（`src/index.ts`）                 | 组件 barrel 导出                    |
| `./main.css`（`src/styles/main.css`） | 样式入口：Tailwind + daisyUI + 字体 |

## 结构

```
src/
├── components/ui/     # 可复用组件（theme-toggle 等）
├── lib/cn.ts          # clsx + tailwind-merge 合并工具
├── styles/
│   ├── main.css       # 样式入口
│   └── fonts.css      # 本地字体 face（Caveat、ZCOOL）
└── assets/fonts/      # 内置字体（latin + zcool unicode-range 拆分）
```

## 用法

```ts
import { ThemeToggle } from '@growth-os/ui'
import '@growth-os/ui/main.css'
```

## 规则

- 只用语义色 token，不硬编码色值——见 [colors.md](../../.trae/rules/frontend/styles/colors.md)。
- 外部样式覆盖走 `cn()` 合并——见 [conflict.md](../../.trae/rules/frontend/styles/conflict.md)。
- 重复 3+ 次的类组合抽成组件放这里——见 [reuse.md](../../.trae/rules/frontend/styles/reuse.md)。

## 已知限制

- 目前只交付了 `theme-toggle`；其余组件待类组合达到 3+ 次复用时再抽取（[reuse.md](../../.trae/rules/frontend/styles/reuse.md)）。
