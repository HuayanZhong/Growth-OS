#!/usr/bin/env node
/**
 * Docs gate: CLAUDE.md pointer check, markdown link validity, word budgets.
 *
 * Usage:
 *   node scripts/verify-docs.cjs          # check only
 *   node scripts/verify-docs.cjs --sync   # rewrite CLAUDE.md as the thin pointer, then check
 *
 * Exits non-zero on any violation.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'scripts/doc-budgets.manifest.json')
const CLAUDE = path.join(ROOT, 'CLAUDE.md')
const POINTER =
  '# Growth OS — Agent Guide\n\n' +
  'Single source of truth: [AGENTS.md](AGENTS.md). Read it for all agent instructions; this file is a thin pointer for Claude Code compatibility.\n'

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

function fail(msg) {
  console.error(`[verify-docs] ${msg}`)
  process.exitCode = 1
}

/** Count Latin words (whitespace tokens) + CJK characters. */
function countWords(text) {
  const latin = (text.match(/\S+/g) || []).length
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  return latin + cjk
}

// --sync mode: rewrite CLAUDE.md as the thin pointer before checking
if (process.argv.includes('--sync')) {
  fs.writeFileSync(CLAUDE, POINTER)
  console.log('[verify-docs] CLAUDE.md reset to the thin pointer')
}

// 1. Word budgets from manifest
const manifest = JSON.parse(read(MANIFEST_PATH))
for (const [rel, cfg] of Object.entries(manifest.files)) {
  const abs = path.join(ROOT, rel)
  const content = read(abs)
  if (content == null) {
    fail(`missing budgeted file: ${rel}`)
    continue
  }
  const n = countWords(content)
  if (n > cfg.maxWords) {
    fail(`word budget exceeded: ${rel} (${n} > ${cfg.maxWords})`)
  }
}

// 2. CLAUDE.md must be exactly the thin pointer
const claude = read(CLAUDE)
if (claude == null) {
  fail('CLAUDE.md missing — run `node scripts/verify-docs.cjs --sync`')
} else if (claude !== POINTER) {
  fail('CLAUDE.md is not the thin pointer — run `node scripts/verify-docs.cjs --sync`')
}

// 3. Relative markdown link validity across managed docs
const managed = [
  'AGENTS.md',
  'CLAUDE.md',
  ...Object.keys(manifest.files).filter((f) => f.endsWith('.md')),
]
for (const rel of managed) {
  const abs = path.join(ROOT, rel)
  const content = read(abs)
  if (content == null) continue
  const re = /\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(content)) !== null) {
    const target = m[1].trim()
    if (/^(https?:|mailto:|#)/.test(target)) continue
    const clean = target.split('#')[0]
    if (!clean) continue
    const targetAbs = path.resolve(path.dirname(abs), clean)
    if (!fs.existsSync(targetAbs)) {
      fail(`dead link in ${rel}: ${target}`)
    }
  }
}

if (process.exitCode) {
  console.error('[verify-docs] FAILED')
} else {
  console.log('[verify-docs] OK')
}
