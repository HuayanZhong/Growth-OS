#!/usr/bin/env node
/**
 * Docs gate: CLAUDE.md pointer check (root + per-layer), markdown link validity across all docs, word budgets, bilingual-pair hashes.
 *
 * Usage:
 *   node scripts/verify-docs.cjs          # check only
 *   node scripts/verify-docs.cjs --sync   # rewrite CLAUDE.md as the thin pointer, then check
 *
 * Exits non-zero on any violation.
 */
const fs = require('node:fs')
const path = require('node:path')
const { checkPairs } = require('./verify-translation-pairing.cjs')

const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'scripts/doc-budgets.manifest.json')
const CLAUDE = path.join(ROOT, 'CLAUDE.md')
const POINTER =
  '# Growth OS — Agent Guide\n\n' +
  'Single source of truth: [AGENTS.md](AGENTS.md). Read it for all agent instructions; this file is a thin pointer for Claude Code compatibility.\n'

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.trae',
  '.agents',
  'dist',
  'coverage',
  '.nuxt',
  '.output',
])

/** Recursively collect all markdown files under ROOT, minus skip dirs. */
function collectMarkdown(dir = ROOT) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...collectMarkdown(abs))
    } else if (entry.name.endsWith('.md')) {
      out.push(path.relative(ROOT, abs))
    }
  }
  return out
}

/** Extract relative markdown link targets from content. */
function linksFrom(content) {
  const links = []
  const re = /\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(content)) !== null) links.push(m[1].trim())
  return links
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

// --sync mode: rewrite root CLAUDE.md as the thin pointer before checking
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

// 2. Bilingual pairs must match their i18n.yaml records
for (const e of checkPairs()) {
  fail(e)
}

// 3. Root CLAUDE.md must be exactly the thin pointer
const claude = read(CLAUDE)
if (claude == null) {
  fail('CLAUDE.md missing — run `node scripts/verify-docs.cjs --sync`')
} else if (claude !== POINTER) {
  fail('CLAUDE.md is not the thin pointer — run `node scripts/verify-docs.cjs --sync`')
}

// 3b. Per-layer CLAUDE.md files must be thin pointers: sibling AGENTS.md + root AGENTS.md
for (const rel of collectMarkdown().filter((f) => f !== 'CLAUDE.md' && f.endsWith('CLAUDE.md'))) {
  const abs = path.join(ROOT, rel)
  const content = read(abs)
  if (content == null) continue
  const links = linksFrom(content)
  const depth = rel.split(/[\\/]/).slice(0, -1).length
  const rootLink = '../'.repeat(depth) + 'AGENTS.md'
  if (!links.includes('AGENTS.md') || !links.includes(rootLink)) {
    fail(`CLAUDE.md is not a thin pointer to sibling + root AGENTS.md: ${rel}`)
  }
}

// 4. Relative markdown link validity across all docs
for (const rel of collectMarkdown()) {
  const abs = path.join(ROOT, rel)
  const content = read(abs)
  if (content == null) continue
  for (const target of linksFrom(content)) {
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
