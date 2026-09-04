# tooling — 共享配置

[English](README.md) | 中文

`tooling/` 存放仓库的共享工具配置。它不是包（无 `package.json`）；包与应用通过 `extends` 和 CLI 参数消费它。TypeScript 配置布局详见 [docs/architecture/typescript-config.md](../docs/architecture/typescript-config.md)。

| 目录 | 配置 | 被谁消费 |
| --- | --- | --- |
| `typescript/` | `base.json` + `runtime/{browser,node}.json` + `framework/*.json` | 每个包/应用的 `tsconfig`（`extends`） |
| `lint/` | `.oxlintrc.json` | `pnpm lint` |
| `format/` | `.oxfmtrc.json` | `pnpm format` |
| `test/` | `base.ts`（Vitest 辅助） | 各应用的 `vitest.config.ts` |

## 规则

- 改动这里就是跨层改动：每个消费方都会受影响。用仓库套件验证（`pnpm typecheck` / `lint` / `format`），并带 Agent Note。
- 保持配置共享；包级覆盖需要书面理由。

## 质量门禁（仓库根）

| 门禁 | 拦截的问题 | 配置位置 |
| --- | --- | --- |
| `pnpm hygiene` | 死代码、未用依赖/导出/文件（knip）+ 无效 `exports`（publint） | `knip.json` + 各包 `publint` 脚本 |
| 各包 `pnpm test:coverage` | 覆盖率（`@vitest/coverage-v8`），`include` 在各 `vitest.config.ts` 内按包圈定 | 各包 `vitest.config.ts` |

框架隐式依赖（CSS 引用、字符串 transport 等 knip 看不到的用法）统一记在 `knip.json` 的 `ignoreDependencies` 并注明原因——不要直接删除，把你自己的同类依赖也记在那里。
