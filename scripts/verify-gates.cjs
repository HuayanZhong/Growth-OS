#!/usr/bin/env node
/**
 * Gate self-monitoring: the gates themselves must not rot silently.
 *
 * Checks:
 *   1. Syntax: `node --check` on every scripts/*.cjs (gates, generators, hooks).
 *   2. hooks.json: parseable, version 1, every event group has command hooks with
 *      non-empty commands.
 *   3. Hook liveness smoke: each hook script survives empty stdin and exits 0 —
 *      the defensive "bad input → allow" promise, verified live.
 *   4. doc-budgets.manifest.json parseable, every entry carries maxWords.
 *
 * Usage:
 *   node scripts/verify-gates.cjs
 *
 * Exits non-zero on any violation.
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const violations = []

function report(message) {
  violations.push(`[verify-gates] ${message}`)
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

// 1. Syntax check every scripts/*.cjs
const scriptsDir = path.join(ROOT, 'scripts')
const cjsFiles = fs
  .readdirSync(scriptsDir)
  .filter((f) => f.endsWith('.cjs'))
  .sort()
for (const f of cjsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(scriptsDir, f)], { stdio: 'pipe' })
  } catch (err) {
    report(`syntax error in scripts/${f}: ${err.stderr}`)
  }
}

// 2. hooks.json structure
const HOOKS = '.trae/hooks.json'
let hooksConfig = null
try {
  hooksConfig = JSON.parse(read(HOOKS))
} catch (err) {
  report(`.trae/hooks.json is not valid JSON: ${err.message}`)
}
if (hooksConfig) {
  if (hooksConfig.version !== 1)
    report(`.trae/hooks.json version must be 1, got ${hooksConfig.version}`)
  const events = hooksConfig.hooks ?? {}
  const eventNames = Object.keys(events)
  if (eventNames.length === 0) report('.trae/hooks.json registers no hook events')
  for (const eventName of eventNames) {
    const groups = events[eventName]
    if (!Array.isArray(groups) || groups.length === 0) {
      report(`.trae/hooks.json event "${eventName}" has no hook groups`)
      continue
    }
    for (const [gi, group] of groups.entries()) {
      for (const [hi, hook] of (group.hooks ?? []).entries()) {
        const where = `${eventName}[${gi}].hooks[${hi}]`
        if (hook.type !== 'command')
          report(`.trae/hooks.json ${where}: unsupported type "${hook.type}"`)
        if (typeof hook.command !== 'string' || hook.command.trim() === '') {
          report(`.trae/hooks.json ${where}: empty command`)
        }
      }
    }
  }
}

// 3. Hook liveness smoke: empty stdin must exit 0 (defensive allow)
for (const hookScript of cjsFiles.filter((f) => f.startsWith('hook-'))) {
  try {
    execFileSync(process.execPath, [path.join(scriptsDir, hookScript)], {
      input: '',
      stdio: 'pipe',
    })
  } catch (err) {
    report(
      `hook smoke failed for scripts/${hookScript}: expected exit 0 on empty stdin, got ${err.status}`,
    )
  }
}

// 4. Budget manifest sanity
try {
  const manifest = JSON.parse(read('scripts/doc-budgets.manifest.json'))
  for (const [file, cfg] of Object.entries(manifest.files ?? {})) {
    if (typeof cfg.maxWords !== 'number' || cfg.maxWords <= 0) {
      report(`doc-budgets.manifest.json: ${file} has invalid maxWords (${cfg.maxWords})`)
    }
  }
} catch (err) {
  report(`scripts/doc-budgets.manifest.json is not valid JSON: ${err.message}`)
}

if (violations.length > 0) {
  for (const v of violations) console.error(v)
  console.error(`[verify-gates] FAILED (${violations.length} violation(s))`)
  process.exit(1)
}
console.log(`[verify-gates] OK (${cjsFiles.length} scripts, hooks.json checked, hook smoke passed)`)
