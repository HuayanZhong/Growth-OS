#!/usr/bin/env node
/**
 * Generate docs/event-catalog.md — the machine-checked producer/consumer map
 * of the session event vocabulary (iteration plan 3.5).
 *
 * Sources scanned (production + test code):
 *   - packages/types/src   — the vocabulary itself (SessionEventType union +
 *     MessageEventPayloadMap), the single source of truth for event names
 *   - packages/shared      — deriveMessages projection, session event bus
 *   - apps/server          — persistence (appendEvent), fork, audit, projection
 *   - apps/desktop         — replay composable and UI consumers
 *
 * Freshness is enforced by verify-docs (it re-runs this generator and compares
 * with the committed file). Regenerate after touching event-related code:
 * `pnpm generate:events`.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/event-catalog.md')
const VOCAB_FILE = 'packages/types/src/events/session.ts'

const SCAN_ROOTS = [
  'packages/shared/src',
  'packages/shared/test',
  'packages/types/src',
  'apps/server/src',
  'apps/server/test',
  'apps/desktop/app',
  'apps/desktop/test',
]

/** Runtime call symbols that produce or consume session events. */
const PRODUCER_SYMBOLS = [
  { pattern: /\.emit\(/, label: 'bus emit' },
  { pattern: /appendEvent\(/, label: 'appendEvent' },
]
const CONSUMER_SYMBOLS = [
  { pattern: /\.on\(/, label: 'bus on' },
  { pattern: /deriveMessages\(/, label: 'deriveMessages' },
  { pattern: /useSessionReplay/, label: 'useSessionReplay' },
]

function listFiles(dir, ext, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      listFiles(full, ext, acc)
    } else if (entry.name.endsWith(ext)) {
      acc.push(full)
    }
  }
  return acc
}

/** Parse the SessionEventType vocabulary out of the types source (single source of truth). */
function parseVocabulary() {
  const source = fs.readFileSync(path.join(ROOT, VOCAB_FILE), 'utf8')
  const pickLiterals = (typeName) => {
    const block = source.match(new RegExp(`export type ${typeName} =((?:\\s*\\|\\s*'[^']+')+)`))
    if (!block) {
      throw new Error(`vocabulary type ${typeName} not found in ${VOCAB_FILE}`)
    }
    return [...block[0].matchAll(/'([^']+)'/g)].map((m) => m[1])
  }
  const messageTypes = pickLiterals('MessageEventType')
  const bookkeepingTypes = pickLiterals('BookkeepingEventType')

  // payload map: "user_message: UserMessagePayload" pairs inside MessageEventPayloadMap
  const mapBlock = source.match(/interface MessageEventPayloadMap[^{]+\{([^}]+)\}/)
  const payloadByType = {}
  if (mapBlock) {
    for (const m of mapBlock[1].matchAll(/(\w+):\s*(\w+)/g)) {
      payloadByType[m[1]] = m[2]
    }
  }

  return [
    ...messageTypes.map((name) => ({ name, kind: 'message', payload: payloadByType[name] ?? '—' })),
    ...bookkeepingTypes.map((name) => ({ name, kind: 'bookkeeping', payload: '自定义' })),
  ]
}

/** Scan a file and return { file, producers, consumers } call-site hits. */
function scanCalls(file, rel) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const producers = []
  const consumers = []
  lines.forEach((line, i) => {
    for (const { pattern, label } of PRODUCER_SYMBOLS) {
      if (pattern.test(line)) {
        producers.push(`${rel}:${i + 1} (${label})`)
      }
    }
    for (const { pattern, label } of CONSUMER_SYMBOLS) {
      if (pattern.test(line)) {
        consumers.push(`${rel}:${i + 1} (${label})`)
      }
    }
  })
  return { producers, consumers }
}

module.exports = { generateEventCatalog }

function generateEventCatalog() {
  const vocabulary = parseVocabulary()

  const scans = []
  for (const root of SCAN_ROOTS) {
    for (const file of listFiles(path.join(ROOT, root), '.ts')) {
      scans.push(scanCalls(file, path.relative(ROOT, file).replace(/\\/g, '/')))
    }
  }
  const producers = scans.flatMap((s) => s.producers).sort()
  const consumers = scans.flatMap((s) => s.consumers).sort()
  const fmt = (list) => (list.length ? list.map((x) => `\`${x}\``).join('<br>') : '—')

  const vocabRows = vocabulary.map((v) => `| \`${v.name}\` | ${v.kind} | ${v.payload} |`)

  // per-type literal distribution (where each event name is referenced)
  const typeDistribution = vocabulary.map((v) => {
    const pattern = new RegExp(`'${v.name}'`)
    const files = []
    for (const root of SCAN_ROOTS) {
      for (const file of listFiles(path.join(ROOT, root), '.ts')) {
        if (pattern.test(fs.readFileSync(file, 'utf8'))) {
          files.push(path.relative(ROOT, file).replace(/\\/g, '/'))
        }
      }
    }
    return `| \`${v.name}\` | ${files.length} | ${fmt(files)} |`
  })

  return `# Event catalog

> **Generated** by [generate-event-catalog.cjs](../scripts/generate-event-catalog.cjs) — do not edit by hand.
> \`pnpm verify:docs\` fails when this file is stale; regenerate with \`pnpm generate:events\` and commit.
> The vocabulary itself lives in [packages/types/src/events/session.ts](../${VOCAB_FILE}); this catalog is the machine-checked producer/consumer view.

## 词汇表

| 事件 | 类别 | Message payload |
| --- | --- | --- |
${vocabRows.join('\n')}

## 生产 / 消费调用点

**Producers**（${producers.length}）：

${producers.length ? producers.map((x) => `- \`${x}\``).join('\n') : '_（暂无运行时生产调用点——事件生产方随 turn/LLM 管线落地）_'}

**Consumers**（${consumers.length}）：

${consumers.map((x) => `- \`${x}\``).join('\n')}

## 事件类型引用分布

| 事件 | 引用文件数 | 文件 |
| --- | --- | --- |
${typeDistribution.join('\n')}
`
}

if (require.main === module) {
  fs.writeFileSync(OUT, generateEventCatalog())
  console.log(`[generate-event-catalog] wrote ${path.relative(ROOT, OUT)}`)
}
