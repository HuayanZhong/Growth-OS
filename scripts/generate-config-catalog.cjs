#!/usr/bin/env node
/**
 * Generate docs/config-catalog.md from the authoritative config sources.
 *
 * Extraction is static (TypeScript AST, same toolchain as the verify-docs ts
 * snippet check) — no runtime zod introspection, no changes to the sources:
 *   - packages/shared/src/env.ts          → publicEnvSchema (z.object fields)
 *   - apps/server/src/config/env.validation.ts → envSchema extend({...}) fields + JSDoc
 *   - packages/desktop-core/ipc/launch-env.ts  → ALLOWLIST string array
 *
 * Freshness is enforced by verify-docs (it re-runs this generator and compares
 * with the committed file). Regenerate after schema changes: `pnpm generate:config`.
 */
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/config-catalog.md')

const PUBLIC_SCHEMA = 'packages/shared/src/env.ts'
const SERVER_SCHEMA = 'apps/server/src/config/env.validation.ts'
const LAUNCH_ALLOWLIST = 'packages/desktop-core/ipc/launch-env.ts'

function parseSource(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true)
}

/** Object literal assigned to `const <varName> = ...`, through any call chain. */
function findObjectLiteral(sf, varName) {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue
    const decl = st.declarationList.declarations[0]
    if (!decl || decl.name.getText(sf) !== varName) continue
    let found = null
    const visit = (node) => {
      if (found) return
      if (ts.isObjectLiteralExpression(node)) {
        found = node
        return
      }
      node.forEachChild(visit)
    }
    visit(decl.initializer)
    return found
  }
  return null
}

/** String array assigned to `const <varName>`, with quotes stripped. */
function findStringArray(sf, varName) {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue
    const decl = st.declarationList.declarations[0]
    if (!decl || decl.name.getText(sf) !== varName) continue
    if (!ts.isArrayLiteralExpression(decl.initializer)) continue
    return decl.initializer.elements.map((e) => e.getText(sf).replace(/^['"]|['"]$/g, ''))
  }
  return null
}

/** Fields of a schema object literal: name, validation expression text, leading comment as description. */
function extractFields(sf, obj) {
  const out = []
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    // comments live in the leading trivia: scan from fullStart, not start
    const ranges = ts.getLeadingCommentRanges(sf.getText(), prop.getFullStart()) || []
    const description = ranges
      .map((r) => sf.getText().slice(r.pos, r.end))
      .join('\n')
      .replace(/\/\*+|\*+\//g, '')
      .split('\n')
      .map((l) =>
        l
          .replace(/^\s*\*\s?/, '')
          .replace(/^\s*\/\/\s?/, '')
          .trim(),
      )
      .filter(Boolean)
      .join(' ')
    out.push({
      name: prop.name.getText(sf),
      validation: prop.initializer.getText(sf),
      description,
    })
  }
  return out
}

function fieldTable(fields, withDescription) {
  const head = withDescription
    ? '| Variable | Validation | Description |'
    : '| Variable | Validation |'
  const rule = withDescription ? '| --- | --- | --- |' : '| --- | --- |'
  const rows = fields.map((f) => {
    const desc = withDescription ? ` ${f.description || '—'} |` : ''
    return `| \`${f.name}\` | \`${f.validation}\` |${desc}`
  })
  return [head, rule, ...rows].join('\n')
}

function generateConfigCatalog() {
  const publicSf = parseSource(PUBLIC_SCHEMA)
  const serverSf = parseSource(SERVER_SCHEMA)
  const launchSf = parseSource(LAUNCH_ALLOWLIST)

  const publicFields = extractFields(publicSf, findObjectLiteral(publicSf, 'publicEnvSchema'))
  const serverFields = extractFields(serverSf, findObjectLiteral(serverSf, 'envSchema'))
  const allowlist = findStringArray(launchSf, 'ALLOWLIST')
  if (!publicFields.length || !serverFields.length || !allowlist) {
    throw new Error('config-catalog extraction failed: expected source symbols not found')
  }

  return `# Configuration catalog

> **Generated** by [generate-config-catalog.cjs](../scripts/generate-config-catalog.cjs) — do not edit by hand.
> \`pnpm verify:docs\` fails when this file is stale; regenerate with \`pnpm generate:config\` and commit.
> [.env.example](../.env.example) holds template values; the dotenv chain order lives in the root [package.json](../package.json) scripts.

## Public runtime schema — \`publicEnvSchema\`

Source: [${PUBLIC_SCHEMA}](../${PUBLIC_SCHEMA}). Consumed by the Nuxt \`runtimeConfig.public\` mapping and by the server through \`publicEnvSchema.partial()\` (all three optional server-side; the extend block below carries no \`NUXT_PUBLIC_*\` keys).

${fieldTable(publicFields, false)}

## Server env schema — \`envSchema\`

Source: [${SERVER_SCHEMA}](../${SERVER_SCHEMA}). Validated by \`ConfigModule\` at boot (skipped when \`CI=true\`); missing or invalid values abort startup. Validation helpers live in \`packages/shared/src/env.ts\`.

${fieldTable(serverFields, true)}

## Desktop launch allowlist

Source: [${LAUNCH_ALLOWLIST}](../${LAUNCH_ALLOWLIST}). The main process hands only these variables to the renderer, which merges them into \`runtimeConfig\` before app assembly (launch-time override; secrets never pass through).

${allowlist.map((k) => `- \`${k}\``).join('\n')}
`
}

module.exports = { generateConfigCatalog }

if (require.main === module) {
  fs.writeFileSync(OUT, generateConfigCatalog())
  console.log(`[generate-config-catalog] wrote ${path.relative(ROOT, OUT)}`)
}
