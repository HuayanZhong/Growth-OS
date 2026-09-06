# Cookbook: add a workspace package

How to add a new library under `packages/`. Before creating anything, read [architecture.md](../architecture.md) (generated topology) and [packages/README.md](../../packages/README.md) (hierarchy, stability expectations, dependency rules).

## 1. Scaffold the package

Create `packages/<name>/package.json` — source-first (no build step), private, ESM:

```json
{
  "name": "@growth-os/<name>",
  "version": "1.0.0",
  "private": true,
  "description": "one line: what this package owns",
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

Turbo picks up these task names automatically (`turbo.json` defines tasks, not packages) — the package joins `pnpm test` / `typecheck` / `lint` with no turbo changes.

Verify: `pnpm install` (links the workspace), then `pnpm --filter @growth-os/<name> typecheck`

## 2. Tooling configs

- `tsconfig.json` extending a `tooling/typescript/` preset — `runtime/node.json` for Node-side code, `runtime/browser.json` for renderer-side; the layering is documented in [typescript-config.md](../architecture/typescript-config.md):
  ```json
  { "extends": "../../tooling/typescript/runtime/node.json", "include": ["src/**/*.ts", "test/**/*.ts"] }
  ```
- `.oxlintrc.json` — same content as the other packages' (see [packages/shared/.oxlintrc.json](../../packages/shared/.oxlintrc.json)).
- Dependencies: always pnpm catalogs — `"zod": "catalog:shared"` — declared in [pnpm-workspace.yaml](../../pnpm-workspace.yaml), never inline versions; workspace deps use `"workspace:*"`.

## 3. Barrel + tests

Single entry `src/index.ts`; tests mirror sources in `test/` (`src/x/y.ts` → `test/x/y.test.ts`).

Verify: `pnpm --filter @growth-os/<name> test`

## 4. Docs (bilingual, gated)

- `README.md` (EN, authoritative) + `README.zh.md` (mirror) — purpose, exports, rules.
- Register the pair in [scripts/doc-pairs.manifest.json](../../scripts/doc-pairs.manifest.json) and the budget in [scripts/doc-budgets.manifest.json](../../scripts/doc-budgets.manifest.json), then `pnpm verify:pairing --write packages/<name>/README.md`.
- `AGENTS.md` (package-specific agent rules) + `CLAUDE.md` thin pointer — `node scripts/verify-docs.cjs --sync` can't create these; copy the pointer shape from an existing package.

## 5. Register in the maps

- Add the package to the Hierarchy table in [packages/README.md](../../packages/README.md).
- The dependency graph is generated — add the package wherever it belongs, then:

```bash
pnpm generate:graph
pnpm verify:docs
```

## 6. Full verification

```bash
pnpm install
pnpm --filter @growth-os/<name> test
pnpm --filter @growth-os/<name> typecheck
pnpm hygiene   # knip catches unused deps/exports, publint validates the exports map
pnpm verify:docs
```
