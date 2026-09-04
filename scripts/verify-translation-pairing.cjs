#!/usr/bin/env node
/**
 * Bilingual-pair consistency check (DeepSeek-Harness pattern, adapted).
 *
 * Each bilingual doc pair in scripts/doc-pairs.manifest.json is tracked by a
 * record file `<en>.i18n.yaml` (next to the English side) that stores the git
 * blob hash of both sides as of the last confirmed-consistent state. A side
 * edited without its mirror is an incomplete change.
 *
 * Usage:
 *   node scripts/verify-translation-pairing.cjs             # check only
 *   node scripts/verify-translation-pairing.cjs --write     # re-record all pairs
 *
 * Exits non-zero on any violation. Also callable from verify-docs.cjs via checkPairs().
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'scripts/doc-pairs.manifest.json')

/**
 * Git blob hash (sha1 of `blob <len>\0<content>`) over LF-normalized content.
 *
 * 工作区行尾随平台不同（Windows autocrlf 检出为 CRLF，CI 检出为 LF），
 * 哈希前归一化为 LF：记录与校验在任意平台得到同一结果，文本文件归一化后
 * 也与提交进仓库的 blob 内容一致。
 */
function gitBlobHash(content) {
  const normalized = content.replace(/\r\n/g, '\n')
  const buf = Buffer.from(normalized, 'utf8')
  return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
}

function recordPathFor(en) {
  const dir = path.dirname(en)
  const base = path.basename(en).replace(/\.md$/, '')
  return path.join(dir, `${base}.i18n.yaml`)
}

function readRecord(recordAbs) {
  if (!fs.existsSync(recordAbs)) return null
  const text = fs.readFileSync(recordAbs, 'utf8')
  const out = {}
  const re = /^([\w.-]+):\s*([0-9a-f]{40})$/gm
  let m
  while ((m = re.exec(text)) !== null) out[m[1]] = m[2]
  return out
}

function writeRecord(recordAbs, entries) {
  const lines = [
    '# Bilingual-pair consistency record: the git blob hash of each side',
    '# as of the last confirmed-consistent state. Both languages carry equal',
    '# authority; after editing either side, bring the other along and re-record with:',
    '#   pnpm verify:pairing --write <path>',
    ...entries.map(([file, hash]) => `${file}: ${hash}`),
    '',
  ]
  fs.writeFileSync(recordAbs, lines.join('\n'))
}

/** Check (or re-record) every pair. Returns an array of error strings. */
function checkPairs({ write = false } = {}) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  const errors = []
  for (const [en, zh] of manifest.pairs) {
    const enAbs = path.join(ROOT, en)
    const zhAbs = path.join(ROOT, zh)
    const enHash = fs.existsSync(enAbs) ? gitBlobHash(fs.readFileSync(enAbs, 'utf8')) : null
    const zhHash = fs.existsSync(zhAbs) ? gitBlobHash(fs.readFileSync(zhAbs, 'utf8')) : null
    if (!enHash || !zhHash) {
      errors.push(`pair missing a side: ${en} / ${zh}`)
      continue
    }
    const recordAbs = path.join(ROOT, recordPathFor(en))
    if (write) {
      writeRecord(recordAbs, [
        [path.basename(en), enHash],
        [path.basename(zh), zhHash],
      ])
      console.log(`[verify-translation-pairing] recorded ${recordPathFor(en)}`)
      continue
    }
    const recorded = readRecord(recordAbs)
    const zhKey = path.basename(zh)
    if (!recorded || recorded[path.basename(en)] !== enHash || recorded[zhKey] !== zhHash) {
      errors.push(
        `pair out of sync: ${en} / ${zh} — run \`pnpm verify:pairing --write ${en}\` to re-record`,
      )
    }
  }
  return errors
}

if (require.main === module) {
  const write = process.argv.includes('--write')
  const errors = checkPairs({ write })
  for (const e of errors) console.error(`[verify-translation-pairing] ${e}`)
  if (!write && errors.length) process.exitCode = 1
  if (!write && !errors.length) console.log('[verify-translation-pairing] OK')
}

module.exports = { checkPairs, gitBlobHash, recordPathFor }
