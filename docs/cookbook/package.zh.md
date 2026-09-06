# Cookbook：加一个 workspace 包

如何在 `packages/` 下新增共享库。动手前先读 [architecture.md](../architecture.md)（生成的拓扑）与 [packages/README.md](../../packages/README.md)（层级、稳定性预期、依赖规则）。

## 1. 搭骨架

创建 `packages/<name>/package.json`——源码直出（无构建步骤）、私有、ESM：

```json
{
  "name": "@growth-os/<name>",
  "version": "1.0.0",
  "private": true,
  "description": "一句话：这个包管什么",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "lint": "oxlint --fix --config .oxlintrc.json",
    "format": "oxfmt --config ../../tooling/format/.oxfmtrc.json",
    "publint": "publint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

Turbo 按任务名自动发现包（`turbo.json` 定义的是任务，不是包清单）——新包无需改 turbo 就进入 `pnpm test` / `typecheck` / `lint` 管线。

验证：`pnpm install`（建立 workspace 链接），然后 `pnpm --filter @growth-os/<name> typecheck`

## 2. 工具链配置

- `tsconfig.json` 继承 `tooling/typescript/` 预设——Node 侧用 `runtime/node.json`，渲染层用 `runtime/browser.json`；分层设计见 [typescript-config.md](../architecture/typescript-config.md)：
  ```json
  { "extends": "../../tooling/typescript/runtime/node.json", "include": ["src/**/*.ts", "test/**/*.ts"] }
  ```
- `.oxlintrc.json`——与其他包同款（参照 [packages/shared/.oxlintrc.json](../../packages/shared/.oxlintrc.json)）。
- 依赖：一律走 pnpm catalogs——`"zod": "catalog:shared"`——在 [pnpm-workspace.yaml](../../pnpm-workspace.yaml) 声明，绝不写内联版本；workspace 依赖用 `"workspace:*"`。

## 3. Barrel 与测试

唯一出口 `src/index.ts`；测试镜像源码放 `test/`（`src/x/y.ts` → `test/x/y.test.ts`）。

验证：`pnpm --filter @growth-os/<name> test`

## 4. 文档（双语，受门禁）

- `README.md`（英文权威）+ `README.zh.md`（镜像）——用途、导出、规则。
- 把配对登记进 [scripts/doc-pairs.manifest.json](../../scripts/doc-pairs.manifest.json)、字数预算登记进 [scripts/doc-budgets.manifest.json](../../scripts/doc-budgets.manifest.json)，然后 `pnpm verify:pairing --write packages/<name>/README.md`。
- `AGENTS.md`（包级 agent 规则）+ `CLAUDE.md` 薄指针——`node scripts/verify-docs.cjs --sync` 只管根指针，这两个文件从现有包复制形态。

## 5. 登记进地图

- 把新包加进 [packages/README.md](../../packages/README.md) 的 Hierarchy 表。
- 依赖图是生成物——把依赖关系加好后：

```bash
pnpm generate:graph
pnpm verify:docs
```

## 6. 交付前全套验证

```bash
pnpm install
pnpm --filter @growth-os/<name> test
pnpm --filter @growth-os/<name> typecheck
pnpm hygiene   # knip 抓未用依赖/导出，publint 校验 exports 映射
pnpm verify:docs
```
