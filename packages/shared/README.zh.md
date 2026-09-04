# @growth-os/shared

[English](README.md) | 中文

零运行时依赖（仅 `zod`）的跨包通用工具：env 校验、URL 标准化与会话事件投影。

## 导出

| 模块                    | 用途                                              |
| ----------------------- | ------------------------------------------------- |
| `src/env.ts`            | env 校验工具（server 与桌面端共用）               |
| `src/normalize.ts`      | URL 标准化工具                                    |
| `src/session-events.ts` | 会话事件投影（`deriveMessages` 生成模型可见历史） |

## 用法

```ts
import { normalizeUrl } from '@growth-os/shared'
```

## 契约

- 保持本包除 `zod` 外零依赖；它是 `apps/server` 与 `apps/desktop` 共同依赖的叶子包。
- 行为变更会影响全仓库——改动前先跑仓库验证套件（`pnpm test` / `typecheck` / `lint`）。
