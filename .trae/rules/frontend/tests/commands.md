---
alwaysApply: false
description: 测试命令与验证规则（pnpm + turbo）：pnpm test 直接运行（vitest.config 已自动加载根 .env，无需手动注入）；验证顺序 test → typecheck → lint 全绿。运行测试、提交前验证时使用。
---

# 命令与验证

**适用场景**：运行测试、提交前整体验证。

**要点**：

1. 运行方式：
   - 单个应用：`cd apps/desktop && pnpm test`（vitest run）
   - 指定文件：`pnpm vitest run test/unit/use-auth.test.ts`
   - 全仓：根目录 `pnpm test`（turbo run test）
2. `.env` 由 vitest.config.ts 启动时自动从根目录加载并注入 `process.env`，无需手动 `$env:` 注入；不依赖 turbo `globalEnv` 声明（Supabase 变量未列入其中）。
3. 提交前验证顺序：`pnpm test` → `pnpm typecheck` → `pnpm lint`，三者都必须通过。
4. typecheck 覆盖 `test/unit`（nuxt.config 的 `typescript.tsConfig.include` 已扩展），测试文件自身的类型错误（如 TS2532）会被捕获，不要绕过。
5. `test/**` 已豁免 `import/first`（`mockNuxtImport` 需在被 mock 模块 import 之前），lint 不会报该规则。

**示例**：

```bash
pnpm test && pnpm typecheck && pnpm lint
```

**验证**：

```bash
cd apps/desktop && pnpm test
# 直接通过，不需要任何环境变量前缀
```
