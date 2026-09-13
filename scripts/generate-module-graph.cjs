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

const toId = (dirPath) => dirPath.replace(/[^a-z0-9]/gi, '_')

/** Workspace deps of one package.json, split by dependency kind. */
function extractDeps(pkg) {
  const pick = (section) =>
    Object.entries(pkg[section] ?? {})
      .filter(([name]) => name.startsWith('@growth-os/'))
      .map(([name]) => name)
  return { runtime: pick('dependencies'), dev: pick('devDependencies') }
}

/** Collect [pkgName, nodeId, deps] for one group directory. */
function collectGroup(group) {
  const dir = path.join(ROOT, group)
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'package.json')))
    .map((e) => {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, e.name, 'package.json'), 'utf8'))
      return [pkg.name, toId(`${group}/${e.name}`), extractDeps(pkg)]
    })
}

function groupTable(group, pkgs) {
  const rows = pkgs.map(([name, , deps]) => {
    const fmt = (list) => (list.length ? list.map((n) => `\`${n}\``).join(', ') : '—')
    return `| \`${name}\` | ${fmt(deps.runtime)} | ${fmt(deps.dev)} |`
  })
  return [
    '| Package | Workspace dependencies | Workspace devDependencies |',
    '| --- | --- |',
    ...rows,
  ].join('\n')
}

/**
 * Mermaid flowchart of the same data: solid arrow = runtime dependency,
 * dashed arrow = devDependency. Nodes are declared once with package names,
 * edges resolve dependency names through the same id map.
 */
function groupMermaid(groupsData) {
  const ids = new Map(
    groupsData.flatMap(([, pkgs]) => pkgs.map(([name, nodeId]) => [name, nodeId])),
  )
  const lines = ['```mermaid', 'graph LR']
  for (const [group, pkgs] of groupsData) {
    lines.push(`  subgraph ${group}`)
    for (const [name, nodeId] of pkgs) {
      lines.push(`    ${nodeId}["${name}"]`)
    }
    lines.push('  end')
  }
  for (const [, pkgs] of groupsData) {
    for (const [name, nodeId, deps] of pkgs) {
      for (const dep of deps.runtime) lines.push(`    ${nodeId} --> ${ids.get(dep)}`)
      for (const dep of deps.dev) lines.push(`    ${nodeId} -.-> ${ids.get(dep)}`)
    }
  }
  lines.push('```')
  return lines.join('\n')
}

function generateModuleGraph() {
  const groupsData = GROUPS.map((group) => [group, collectGroup(group)])
  const sections = groupsData.map(([group, pkgs]) => `## ${group}\n\n${groupTable(group, pkgs)}`)
  return `# Module graph

> **Generated** by [generate-module-graph.cjs](../scripts/generate-module-graph.cjs) — do not edit by hand.
> \`pnpm verify:docs\` fails when this file is stale; regenerate with \`pnpm generate:graph\` and commit.
> External (non-workspace) dependencies are not listed; the dependency rules that always hold live in [packages/README.md](../packages/README.md).

${sections.join('\n\n')}

## Dependency diagram

Solid arrow: runtime dependency; dashed arrow: devDependency.

${groupMermaid(groupsData)}
`
}

module.exports = { generateModuleGraph }

if (require.main === module) {
  fs.writeFileSync(OUT, generateModuleGraph())
  console.log(`[generate-module-graph] wrote ${path.relative(ROOT, OUT)}`)
}
