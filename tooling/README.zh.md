# tooling — 共享配置

[English](README.md) | 中文

`tooling/` 存放仓库的共享工具配置。它不是包（无 `package.json`）；包与应用通过 `extends` 和 CLI 参数消费它。TypeScript 配置布局详见 [docs/architecture/typescript-config.md](../docs/architecture/typescript-config.md)。

| 目录 | 配置 | 被谁消费 |
| --- | --- | --- |
| `typescript/` | `base.json` + `runtime/{browser,node}.json` + `framework/*.json` | 每个包/应用的 `tsconfig`（`extends`） |
| `lint/` | `.oxlintrc.json` | `pnpm lint` |
| `format/` | `.oxfmtrc.json` | `pnpm format` |
| `test/` | `base.ts`（Vitest 辅助） | `vitest.workspace.ts` |

## 规则

- 改动这里就是跨层改动：每个消费方都会受影响。用仓库套件验证（`pnpm typecheck` / `lint` / `format`），并带 Agent Note。
- 保持配置共享；包级覆盖需要书面理由。
