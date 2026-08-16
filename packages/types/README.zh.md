# @growth-os/types

[English](README.md) | 中文

全仓库类型分发：跨包共享的 zod schema、业务类型与类型化 IPC 通道契约。

## 导出

| 模块 | 用途 |
| --- | --- |
| `src/auth.ts` | 认证相关共享类型/schema |
| `src/utils/ipc-channels.ts` | desktop 与 desktop-core 之间的类型化 IPC 通道契约 |
| `src/index.ts` | barrel 导出 |

## 契约

- IPC 通道契约以此处为准——`packages/desktop-core` 与 `apps/desktop` 都消费它；改动通道是跨包变更，必须同一变更内更新所有消费方。
- 只放类型，不写运行时逻辑。

## 已知限制

- IPC 契约目前只覆盖 `desktop` ⇄ `desktop-core` 这一对；server 侧通道未在此建模。
