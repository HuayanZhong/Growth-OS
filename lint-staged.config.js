/**
 * lint-staged 配置 —— 提交前对暂存文件自动格式化 + lint。
 *
 * oxfmt 用根 tooling/format/.oxfmtrc.json 统一格式化，--threads=1 规避 Windows VirtualAlloc 崩溃。
 * oxlint 用根 tooling/lint/.oxlintrc.json 做快速检查（不带各包的 tailwindcss 等插件）。
 * .vue 文件只格式化，lint 留给 `pnpm --filter <pkg> lint`（各包有独立 oxlint 配置）。
 * .agents/ 与 .trae/ 下的 vendored 技能资产不参与格式化与 lint：保持与上游一致，
 * 且第三方脚本不满足本仓库 lint 规则（oxlint 实测 7 errors）。
 */
const VENDORED_PREFIXES = ['.agents/', '.trae/']

const ownFiles = (files) => files.filter((f) => !VENDORED_PREFIXES.some((p) => f.startsWith(p)))

export default {
  '*.{ts,tsx,js,cjs,mjs}': (files) => {
    const own = ownFiles(files)
    if (own.length === 0) return []
    return [
      `oxfmt --threads=1 --config tooling/format/.oxfmtrc.json --write ${own.join(' ')}`,
      `oxlint --fix --config tooling/lint/.oxlintrc.json ${own.join(' ')}`,
    ]
  },
  '*.vue': (files) => {
    const own = ownFiles(files)
    if (own.length === 0) return []
    return `oxfmt --threads=1 --config tooling/format/.oxfmtrc.json --write ${own.join(' ')}`
  },
}
