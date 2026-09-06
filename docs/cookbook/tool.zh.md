# Cookbook：加一个开发工具

如何在 `scripts/` 下加工具（检查器、生成器、迁移辅助）。活例：[verify-docs.cjs](../../scripts/verify-docs.cjs)（检查器）、[generate-config-catalog.cjs](../../scripts/generate-config-catalog.cjs)（生成器）、[verify-translation-pairing.cjs](../../scripts/verify-translation-pairing.cjs)（向其他脚本导出函数的检查器）。

## 1. 位置与模块格式

单文件：`scripts/<name>.cjs`。`.cjs` 扩展名必须——仓库根是 `"type": "module"`，而这些工具是 CommonJS。knip 的根 entry（[knip.json](../../knip.json) 里的 `scripts/**/*.cjs`）自动覆盖新文件；子目录只放工具读取的资产（如 `scripts/certs/`、`scripts/*.manifest.json`）。

## 2. 检查器 vs 生成器

**检查器**（校验，违规时非零退出）：用 `fail(msg)` 收集违规——输出到 stderr 并置 `process.exitCode = 1`，不要 `throw`；门禁应报告全部问题，而非首个就死：

```js
function fail(msg) {
  console.error(`[my-tool] ${msg}`)
  process.exitCode = 1
}
```

**生成器**（从源码渲染文档）：把渲染导出为纯函数，保留写文件的 CLI 分支——verify-docs 的新鲜度门禁会重跑该函数，与提交产物逐字节比对：

```js
module.exports = { generateThing }

if (require.main === module) {
  fs.writeFileSync(OUT, generateThing())
}
```

## 3. 解析 TypeScript 源码

用根 `typescript` devDependency（`require('typescript')`，当前 TS 6）。两个已经踩过的坑——可用模式见 `generate-config-catalog.cjs`：

- 前导注释在 trivia 里：`ts.getLeadingCommentRanges(text, node.getFullStart())`，绝不用 `getStart()`。
- 诊断的 `fileName` 在 Windows 上也是正斜杠——路径比较前先归一化，否则过滤器静默失配。

## 4. 接线

- 根 `package.json` script，按惯例命名：`verify:*` 用于检查（`verify-docs`/CI 的候选），`generate:*` 用于产出入库文件的生成器。
- 若工具检查的是每次提交都必须满足的事，作为一节并入 `scripts/verify-docs.cjs`（编号检查），不要加新 husky hook——pre-commit 已经跑这一道门禁。
- 若生成文档，把 `{ file, regen, generate }` 登记进 `verify-docs.cjs` 的 `GENERATED_DOCS` 列表，并提交生成产物。

## 5. 验证

```bash
node scripts/<name>.cjs          # 在真实仓库上跑；检查输出/diff
pnpm verify:docs                 # 若已并入门禁
pnpm lint                        # 提交时 lint-staged 会格式化 scripts/*.cjs（oxfmt + oxlint）
```

生成器还要证明门禁有效：篡改生成文件，跑 `pnpm verify:docs`（必须 fail），重新生成，再跑（必须 pass）。
