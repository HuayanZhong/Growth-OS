#!/usr/bin/env node
/**
 * Generate docs/module-graph.md from the workspace package.json files.
 *
 * Extracts `@growth-os/*` entries from `dependencies` and `devDependencies`
 * of every `apps/*` and `packages/*` package. The authoritative dependency
 * rules live in packages/README.md; this catalog is the machine-checked view.
 *
 * Freshness is enforced by verify-docs (it re-runs this generator and compares
 * with the committed file). Regenerate after dependency changes: `pnpm generate:graph`.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/module-graph.md')
const GROUPS = ['apps', 'packages']

/** @growth-os/* deps of one package, split by dependency kind. */
function extractDeps(pkgDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
  const pick = (section) =>
    Object.entries(pkg[section] ?? {})
      .filter(([name]) => name.startsWith('@growth-os/'))
      .map(([name]) => name)
  return { runtime: pick('dependencies'), dev: pick('devDependencies') }
}

function groupTable(group) {
  const dir = path.join(ROOT, group)
  const rows = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'package.json')))
    .map((e) => {
      const deps = extractDeps(path.join(dir, e.name))
      const fmt = (list) => (list.length ? list.map((n) => `\`${n}\``).join(', ') : '—')
      return `| \`${group}/${e.name}\` | ${fmt(deps.runtime)} | ${fmt(deps.dev)} |`
    })
  return [
    '| Package | Workspace dependencies | Workspace devDependencies |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n')
}

function generateModuleGraph() {
  return `# Module graph

> **Generated** by [generate-module-graph.cjs](../scripts/generate-module-graph.cjs) — do not edit by hand.
> \`pnpm verify:docs\` fails when this file is stale; regenerate with \`pnpm generate:graph\` and commit.
> External (non-workspace) dependencies are not listed; the dependency rules that always hold live in [packages/README.md](../packages/README.md).

${GROUPS.map((group) => `## ${group}\n\n${groupTable(group)}`).join('\n\n')}
`
}

module.exports = { generateModuleGraph }

if (require.main === module) {
  fs.writeFileSync(OUT, generateModuleGraph())
  console.log(`[generate-module-graph] wrote ${path.relative(ROOT, OUT)}`)
}
