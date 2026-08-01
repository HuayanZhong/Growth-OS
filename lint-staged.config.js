/**
 * lint-staged 配置 —— 提交前对暂存文件自动格式化 + lint。
 *
 * oxfmt 用根 tooling/format/.oxfmtrc.json 统一格式化，--threads=1 规避 Windows VirtualAlloc 崩溃。
 * oxlint 用根 tooling/lint/.oxlintrc.json 做快速检查（不带各包的 tailwindcss 等插件）。
 * .vue 文件只格式化，lint 留给 `pnpm --filter <pkg> lint`（各包有独立 oxlint 配置）。
 */
export default {
  '*.{ts,tsx,js,cjs,mjs}': (files) => [
    `oxfmt --threads=1 --config tooling/format/.oxfmtrc.json --write ${files.join(' ')}`,
    `oxlint --fix --config tooling/lint/.oxlintrc.json ${files.join(' ')}`,
  ],
  '*.vue': (files) =>
    `oxfmt --threads=1 --config tooling/format/.oxfmtrc.json --write ${files.join(' ')}`,
}
