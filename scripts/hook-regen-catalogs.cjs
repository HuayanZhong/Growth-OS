#!/usr/bin/env node
/**
 * Trae PostToolUse hook: regenerate derived docs when their sources change.
 *
 * Mapping (source → generator), kept explicit for extension:
 *   - packages/shared/src/session-events.ts and packages/shared/src/events/… → pnpm generate:events
 *   - .env.example                                                           → pnpm generate:config
 *   - apps/<pkg>/package.json, packages/<pkg>/package.json                   → pnpm generate:graph
 *
 * Unmatched paths exit silently. Generator failure writes a hint to stderr and exits 0 —
 * staleness is still caught by verify:docs at pre-commit/CI, so the agent never wedges.
 */
const fs = require('node:fs')
const { execSync } = require('node:child_process')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

const MAPPINGS = [
  {
    match: (rel) =>
      rel === 'packages/shared/src/session-events.ts' ||
      rel.startsWith('packages/shared/src/events/'),
    generate: 'node scripts/generate-event-catalog.cjs',
    label: 'docs/event-catalog.md',
  },
  {
    match: (rel) => rel === '.env.example',
    generate: 'node scripts/generate-config-catalog.cjs',
    label: 'docs/config-catalog.md',
  },
  {
    match: (rel) =>
      /^apps\/[^/]+\/package\.json$/.test(rel) || /^packages\/[^/]+\/package\.json$/.test(rel),
    generate: 'node scripts/generate-module-graph.cjs',
    label: 'docs/module-graph.md',
  },
]

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

const event = readStdin()
if (!event || event.hook_event_name !== 'PostToolUse') process.exit(0)

const toolInput = event.tool_input ?? {}
const filePath = toolInput.file_path ?? toolInput.path
if (typeof filePath !== 'string' || filePath === '') process.exit(0)

const abs = path.isAbsolute(filePath) ? filePath : path.join(event.cwd ?? ROOT, filePath)
const rel = path.relative(ROOT, abs).replace(/\\/g, '/')

for (const { match, generate, label } of MAPPINGS) {
  if (!match(rel)) continue
  try {
    execSync(generate, { cwd: ROOT, stdio: 'pipe' })
    process.stderr.write(`[hook-regen-catalogs] regenerated ${label} (source: ${rel})\n`)
  } catch (err) {
    process.stderr.write(
      `[hook-regen-catalogs] regeneration failed for ${label}: ${err.message}. ` +
        `Run \`${generate}\` manually — verify:docs will catch staleness at pre-commit/CI.\n`,
    )
  }
}
process.exit(0)
