# @growth-os/* 包

[English](README.md) | 中文

`packages/` 目录存放 monorepo 的共享库。权威拓扑与数据流见 [docs/architecture.md](../docs/architecture.md)；本文件记录包层级、稳定性期望与依赖规则。

## 层级

| 包 | 职责 | 稳定性 |
| --- | --- | --- |
| [shared](shared/README.md) | env/URL 标准化工具，零依赖（外加 `zod`） | 内部 — 叶子，表面稳定 |
| [types](types/README.md) | 共享 zod schema + 类型化 IPC 通道契约 | 内部 — 叶子，表面稳定 |
| [ui](ui/README.md) | 设计系统组件与样式（Tailwind v4 + daisyUI 5） | 内部 — 表面增长中 |
| [desktop-core](desktop-core/README.md) | Electron 主进程 + preload | 内部 — 桥接，表面稳定 |

当前所有包均为 `内部`：无外部消费者，随仓库统一发布。`表面稳定` 指公开导出经过契约审查、改动需在同一变更内同步消费方；`表面增长中` 指导出列表仍在扩展（见 [AGENTS.md](AGENTS.md)）。

## 依赖

依赖图以 [docs/architecture.md](../docs/architecture.md) 的包拓扑为准。以下规则始终成立：

- `shared` 与 `types` 是叶子——下面没有依赖它们的包，它们除 `zod` 外不依赖任何东西。
- `ui` 只被 app 消费；禁止从包反向 import app。
- `desktop-core` 只被 `apps/desktop` 消费；其 IPC 契约来自 `types`，禁止内联声明。
- 无环；无"包 → app"依赖。

## 约定

- 所有包为 `"type": "module"`，barrel 导出在 `src/index.ts`（desktop-core 例外，入口是编译产物 `dist/main.js`）。
- lint / format / typecheck 使用共享的 `tooling/` 配置；包内脚本（`pnpm --filter <pkg> typecheck` 等）与根套件对应。
- 依赖使用 pnpm catalog（`catalog:*`，声明在 `pnpm-workspace.yaml`），不写内联版本。

## 包 README

每个包都有双文契约（`README.md` 英文 + `README.zh.md` 中文），外加 `AGENTS.md`（包级 agent 规则）与 `CLAUDE.md`（薄指针）——见上表。包 README 覆盖用途、导出与规则；存在已知限制时列出。
