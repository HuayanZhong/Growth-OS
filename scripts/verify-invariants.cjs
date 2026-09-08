#!/usr/bin/env node
/**
 * Structural invariant checks — machine enforcement for rules that review alone used to carry.
 *
 * Checks:
 *   1. ZodValidationPipe mounting: every @Body(...) / @Query(...) in apps/server/src/modules
 *      controllers carries a ZodValidationPipe (unvalidated input must not reach services).
 *   2. forFeature contextName: every MikroOrmModule.forFeature(...) call repeats the
 *      contextName declared in mikro-orm.config.ts (token mismatch crashes at boot).
 *   3. Strip-only safety: packages/shared + packages/types sources use no parameter
 *      properties and no enums — Node loads these TS sources via type stripping, and
 *      code-generating syntax fails at runtime (ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX).
 *   4. Server ESM: apps/server/src uses no require/__dirname/__filename, and relative
 *      imports carry explicit extensions (rewritten to .js by tsc; missing extensions
 *      are ERR_MODULE_NOT_FOUND at runtime).
 *
 * Line-level exemption: append `// invariant: skip` to a violating line when a raw body
 * or other legitimate exception is warranted.
 *
 * Usage:
 *   node scripts/verify-invariants.cjs
 *
 * Exits non-zero on any violation.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

const violations = []

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function walkTs(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkTs(abs))
    else if (entry.name.endsWith('.ts')) out.push(abs)
  }
  return out
}

function lineOf(content, idx) {
  return content.slice(0, idx).split('\n').length
}

function report(relFile, line, message) {
  violations.push(`[verify-invariants] ${relFile}:${line} ${message}`)
}

function isExempt(content, idx) {
  const lineEnd = content.indexOf('\n', idx) + 1 || undefined
  const lineStart = content.lastIndexOf('\n', idx - 1) + 1
  const prevStart = lineStart > 0 ? content.lastIndexOf('\n', lineStart - 2) + 1 : 0
  const currentLine = content.slice(lineStart, lineEnd)
  const prevLine = content.slice(prevStart, lineStart)
  return currentLine.includes('invariant: skip') || prevLine.includes('invariant: skip')
}

/** Match a balanced (...) group starting at the '(' offset; returns inner text or null. */
function balancedParens(text, openIdx) {
  let depth = 0
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) return text.slice(openIdx + 1, i)
    }
  }
  return null
}

function splitTopLevel(args) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < args.length; i++) {
    const ch = args[i]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(args.slice(start, i))
      start = i + 1
    }
  }
  parts.push(args.slice(start))
  return parts.map((p) => p.trim()).filter(Boolean)
}

// ---- 1. ZodValidationPipe mounting on every @Body / @Query ----

function checkControllers() {
  const dir = path.join(ROOT, 'apps/server/src/modules')
  for (const abs of walkTs(dir)) {
    if (!abs.endsWith('.controller.ts')) continue
    const rel = path.relative(ROOT, abs)
    const content = fs.readFileSync(abs, 'utf8')
    const re = /@(Body|Query)\s*\(/g
    let m
    while ((m = re.exec(content)) !== null) {
      if (isExempt(content, m.index)) continue
      const args = balancedParens(content, content.indexOf('(', m.index))
      if (args === null) continue
      if (!args.includes('ZodValidationPipe')) {
        report(rel, lineOf(content, m.index), `@${m[1]}(...) must carry ZodValidationPipe(schema)`)
      }
    }
  }
}

// ---- 2. forFeature repeats the declared contextName ----

function extractContextName() {
  const content = read('apps/server/mikro-orm.config.ts')
  const m = content.match(/contextName:\s*'([^']+)'/)
  return m ? m[1] : null
}

function checkForFeature(contextName) {
  if (!contextName) return
  const dir = path.join(ROOT, 'apps/server/src/modules')
  for (const abs of walkTs(dir)) {
    const rel = path.relative(ROOT, abs)
    const content = fs.readFileSync(abs, 'utf8')
    const re = /MikroOrmModule\.forFeature\s*\(/g
    let m
    while ((m = re.exec(content)) !== null) {
      if (isExempt(content, m.index)) continue
      const args = balancedParens(content, content.indexOf('(', m.index))
      if (args === null) continue
      const parts = splitTopLevel(args)
      const second = parts[1] ?? ''
      if (!second.includes(`'${contextName}'`)) {
        report(
          rel,
          lineOf(content, m.index),
          `forFeature must repeat contextName '${contextName}' as its second argument`,
        )
      }
    }
  }
}

// ---- 3. Strip-only safety for source-loaded packages ----

const PARAM_PROPERTY_RE = /(?:^|[,(]\s*)(?:private|protected|public|readonly)\s+[A-Za-z_$]/
const ENUM_RE = /(?:^|\n)\s*(?:export\s+)?(?:const\s+)?enum\s+[A-Za-z_$]/

function checkStripOnly() {
  for (const pkg of ['packages/shared/src', 'packages/types/src']) {
    for (const abs of walkTs(path.join(ROOT, pkg))) {
      const rel = path.relative(ROOT, abs)
      const content = fs.readFileSync(abs, 'utf8')
      const ctorRe = /constructor\s*\(/g
      let m
      while ((m = ctorRe.exec(content)) !== null) {
        if (isExempt(content, m.index)) continue
        const args = balancedParens(content, content.indexOf('(', m.index))
        if (args === null) continue
        for (const param of splitTopLevel(args)) {
          if (PARAM_PROPERTY_RE.test(`,${param}`)) {
            report(
              rel,
              lineOf(content, m.index),
              'constructor parameter property is not strip-only safe — declare the field and assign inside the constructor',
            )
          }
        }
      }
      const enumMatch = ENUM_RE.exec(content)
      if (enumMatch) {
        report(
          rel,
          lineOf(content, enumMatch.index),
          'enum is not strip-only safe — use a union type or a const map',
        )
      }
    }
  }
}

// ---- 4. Server ESM constraints ----

const CJS_API_RE = /\b__dirname\b|\b__filename\b|\brequire\s*\(/
const RELATIVE_IMPORT_RE = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g
const KNOWN_EXTENSIONS = /\.(?:ts|js|mjs|cjs|json)$/

function checkServerEsm() {
  for (const abs of walkTs(path.join(ROOT, 'apps/server/src'))) {
    const rel = path.relative(ROOT, abs)
    const content = fs.readFileSync(abs, 'utf8')
    const cjsMatch = CJS_API_RE.exec(content)
    if (cjsMatch && !isExempt(content, cjsMatch.index)) {
      report(
        rel,
        lineOf(content, cjsMatch.index),
        `'${cjsMatch[0].trim()}' is a CJS API — server is ESM`,
      )
    }
    let m
    RELATIVE_IMPORT_RE.lastIndex = 0
    while ((m = RELATIVE_IMPORT_RE.exec(content)) !== null) {
      if (isExempt(content, m.index)) continue
      if (!KNOWN_EXTENSIONS.test(m[1])) {
        report(
          rel,
          lineOf(content, m.index),
          `relative import '${m[1]}' must carry an explicit extension (e.g. .ts)`,
        )
      }
    }
  }
}

function main() {
  const contextName = extractContextName()
  checkControllers()
  checkForFeature(contextName)
  checkStripOnly()
  checkServerEsm()

  if (violations.length > 0) {
    for (const v of violations) console.log(v)
    console.error(`[verify-invariants] FAILED (${violations.length} violation(s))`)
    process.exit(1)
  }
  console.log(
    `[verify-invariants] OK (controllers, forFeature contextName '${contextName ?? 'n/a'}', strip-only sources, server ESM)`,
  )
}

main()
