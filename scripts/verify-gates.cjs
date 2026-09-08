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
 *   5. Harness asset word budgets: every rule under .trae/rules, every plan
 *      under .trae/documents and .agents/user-profile.md must have a `harness`
 *      manifest entry and stay within it — over-budget AND missing-entry fail.
 *   6. Platform drift: generated OpenSpec command/skill bodies must be identical
 *      (frontmatter excluded, line endings normalized) across the installed
 *      platforms (.trae / .claude / .opencode / .agents).
 *   7. Hook behavior fixtures: guard blocks a malformed harness write and allows
 *      application/valid harness writes; regen triggers its generator for a
 *      registered source and passes through unregistered paths; the Stop reminder
 *      blocks once with the four closing-review channels and then dedups.
 *   8. Harness asset frontmatter — official formats (Trae rules/subagents, Agent Skills)
 *
 * Usage:
 *   node scripts/verify-gates.cjs
 *
 * Exits non-zero on any violation.
 */
const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
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
const BUDGET_MANIFEST = 'scripts/doc-budgets.manifest.json'
let budgetManifest = null
try {
  budgetManifest = JSON.parse(read(BUDGET_MANIFEST))
} catch (err) {
  report(`${BUDGET_MANIFEST} is not valid JSON: ${err.message}`)
}
for (const section of ['files', 'harness']) {
  const entries = budgetManifest?.[section] ?? {}
  for (const [file, cfg] of Object.entries(entries)) {
    if (typeof cfg.maxWords !== 'number' || cfg.maxWords <= 0) {
      report(`${BUDGET_MANIFEST}: ${file} has invalid maxWords (${cfg.maxWords})`)
    }
  }
}

// 5. Harness asset word budgets (over-budget or missing entry both fail)
function countWords(text) {
  const latin = (text.match(/\S+/g) || []).length
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  return latin + cjk
}

function harnessAssetRels() {
  const rels = []
  for (const dir of ['.trae/rules', '.trae/documents']) {
    const absDir = path.join(ROOT, dir)
    if (!fs.existsSync(absDir)) continue
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, entry.name)
      if (entry.isDirectory()) {
        for (const absMd of walkMd(abs)) rels.push(path.relative(ROOT, absMd))
      } else if (entry.name.endsWith('.md')) {
        rels.push(abs)
      }
    }
  }
  const profile = path.join(ROOT, '.agents', 'user-profile.md')
  if (fs.existsSync(profile)) rels.push(profile)
  return rels.map((abs) => path.relative(ROOT, abs).replace(/\\/g, '/')).sort()
}

{
  const harnessBudgets = budgetManifest?.harness ?? {}
  for (const rel of harnessAssetRels()) {
    const cfg = harnessBudgets[rel]
    if (!cfg) {
      report(`${BUDGET_MANIFEST}: harness asset has no budget entry: ${rel}`)
      continue
    }
    const n = countWords(read(rel))
    if (n > cfg.maxWords) {
      report(`harness word budget exceeded: ${rel} (${n} > ${cfg.maxWords})`)
    }
  }
}

// 5. Harness asset frontmatter — official formats (Trae rules/subagents, Agent Skills)
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/
const AGENT_NAME_RE = /^[A-Za-z][A-Za-z0-9-]{0,49}$/
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function frontmatterOf(content) {
  const m = content.match(FRONTMATTER_RE)
  return m ? m[1] : null
}

function hasField(fm, key) {
  return new RegExp(`^${key}:\\s*\\S`, 'm').test(fm)
}

function walkMd(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkMd(abs))
    else if (entry.name.endsWith('.md')) out.push(abs)
  }
  return out
}

// 6. Platform drift: generated OpenSpec assets must match across platforms
const DRIFT_HINT = 'regenerate with: openspec init --tools "trae,agents,opencode,claude"'

function bodyOf(rel) {
  return (
    read(rel)
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
      .replace(/\r\n/g, '\n')
      // OpenCode injects an argument-passing placeholder line the other platforms lack.
      .replace(/^\*\*Provided arguments\*\*.*(?:\r?\n|$)/gm, '')
      // Platform copies legitimately differ in invocation style (/opsx-apply vs
      // /openspec-apply-change); normalize those tokens so only content drifts.
      .replace(/\/(?:opsx[:-]|openspec-)[a-z0-9-]+/g, '/<invocation>')
      // The CLI rewrites platform markdown (blank lines, list indentation);
      // collapse formatting so only wording drift is compared.
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .join('\n')
  )
}

{
  const traeCmds = path.join(ROOT, '.trae', 'commands')
  if (fs.existsSync(traeCmds)) {
    const cmdFiles = fs
      .readdirSync(traeCmds)
      .filter((f) => f.startsWith('opsx-') && f.endsWith('.md'))
      .sort()
    for (const f of cmdFiles) {
      const name = f.slice('opsx-'.length, -'.md'.length)
      const copies = [
        `.trae/commands/${f}`,
        `.opencode/commands/${f}`,
        `.claude/commands/opsx/${name}.md`,
      ]
      const present = copies.filter((rel) => fs.existsSync(path.join(ROOT, rel)))
      if (present.length !== copies.length) {
        report(
          `platform drift in command "${name}": missing copies (${copies.join(', ')}) — ${DRIFT_HINT}`,
        )
        continue
      }
      const bodies = present.map((rel) => bodyOf(rel))
      if (bodies.some((b) => b !== bodies[0])) {
        report(
          `platform drift in command "${name}": bodies differ across platforms — ${DRIFT_HINT}`,
        )
      }
    }
  }
  for (const skillsRoot of ['.trae', '.agents']) {
    const dir = path.join(ROOT, skillsRoot, 'skills')
    if (!fs.existsSync(dir)) continue
    const openspecSkills = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('openspec-'))
      .map((e) => e.name)
      .sort()
    for (const name of openspecSkills) {
      const relA = `${skillsRoot}/skills/${name}/SKILL.md`
      const relB = `${skillsRoot === '.trae' ? '.agents' : '.trae'}/skills/${name}/SKILL.md`
      const hasA = fs.existsSync(path.join(ROOT, relA))
      const hasB = fs.existsSync(path.join(ROOT, relB))
      if (!hasA || !hasB) {
        report(
          `platform drift in skill "${name}": missing counterpart (${relA}, ${relB}) — ${DRIFT_HINT}`,
        )
        continue
      }
      if (bodyOf(relA) !== bodyOf(relB)) {
        report(
          `platform drift in skill "${name}": bodies differ between .trae and .agents — ${DRIFT_HINT}`,
        )
      }
    }
  }
}

// 7. Hook behavior fixtures: the hooks must do what the protocol promises,
//    not merely survive empty stdin.
const HOOK_SCRIPTS = path.join(ROOT, 'scripts')

function runHook(script, payload) {
  return spawnSync(process.execPath, [path.join(HOOK_SCRIPTS, script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: ROOT,
  })
}

function decisionOf(res) {
  try {
    return JSON.parse(res.stdout || '{}').decision
  } catch {
    return undefined
  }
}

{
  // Guard: block a malformed harness write…
  const guardBlock = runHook('hook-guard-harness.cjs', {
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    cwd: ROOT,
    tool_input: {
      file_path: '.trae/rules/desktop/ipc-contract.md',
      content: '# missing frontmatter\n',
    },
  })
  if (decisionOf(guardBlock) !== 'block')
    report('hook fixture failed: guard did not block a malformed .trae/rules write')

  // …allow an application write…
  const guardApp = runHook('hook-guard-harness.cjs', {
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    cwd: ROOT,
    tool_input: { file_path: 'apps/server/src/app.module.ts', content: 'export {};\n' },
  })
  if (decisionOf(guardApp) === 'block')
    report('hook fixture failed: guard blocked an application write')

  // …and allow a valid harness write.
  const guardValid = runHook('hook-guard-harness.cjs', {
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    cwd: ROOT,
    tool_input: {
      file_path: '.trae/rules/desktop/ipc-contract.md',
      content: '---\nalwaysApply: false\ndescription: probe\n---\n\nbody\n',
    },
  })
  if (decisionOf(guardValid) === 'block')
    report('hook fixture failed: guard blocked a valid harness write')

  // Regen: a registered source triggers its generator…
  const regenHit = runHook('hook-regen-catalogs.cjs', {
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    cwd: ROOT,
    tool_input: { file_path: 'packages/shared/src/session-events.ts' },
  })
  if (
    regenHit.status !== 0 ||
    !(regenHit.stderr || '').includes('regenerated docs/event-catalog.md')
  )
    report(
      'hook fixture failed: regen did not regenerate the event catalog for a registered source',
    )

  // …and unregistered paths pass through untouched.
  const regenSkip = runHook('hook-regen-catalogs.cjs', {
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    cwd: ROOT,
    tool_input: { file_path: 'apps/server/src/app.module.ts' },
  })
  if (regenSkip.status !== 0 || (regenSkip.stderr || '').includes('regenerated'))
    report('hook fixture failed: regen acted on an unregistered path')

  // Stop reminder: blocks once with the four closing-review channels, then dedups.
  const stopState = path.join(os.tmpdir(), 'growth-os-profile-review.json')
  fs.rmSync(stopState, { force: true })
  const stopHit = runHook('hook-user-profile-reminder.cjs', { hook_event_name: 'Stop' })
  let stopReason = ''
  try {
    stopReason = JSON.parse(stopHit.stdout || '{}').reason || ''
  } catch {}
  const channels = ['技能', 'Note', 'profile', 'decay-audit']
  if (decisionOf(stopHit) !== 'block' || !channels.every((m) => stopReason.includes(m)))
    report('hook fixture failed: Stop reminder reason lacks the four closing-review channels')

  const stopDedup = runHook('hook-user-profile-reminder.cjs', { hook_event_name: 'Stop' })
  if ((stopDedup.stdout || '').length > 0)
    report('hook fixture failed: Stop reminder did not respect its dedup window')

  fs.rmSync(stopState, { force: true })
}

function checkHarnessAssets() {
  for (const abs of walkMd(path.join(ROOT, '.trae/rules'))) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/')
    const content = fs.readFileSync(abs, 'utf8')
    const fm = frontmatterOf(content)
    if (fm === null) {
      report(`${rel}: missing YAML frontmatter (Trae rules require alwaysApply/description)`)
      continue
    }
    if (!hasField(fm, 'alwaysApply')) report(`${rel}: frontmatter missing alwaysApply`)
    if (!hasField(fm, 'description'))
      report(`${rel}: frontmatter missing description (smart-activation trigger)`)
  }
  for (const abs of walkMd(path.join(ROOT, '.trae/agents'))) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/')
    const content = fs.readFileSync(abs, 'utf8')
    const fm = frontmatterOf(content)
    if (fm === null) {
      report(`${rel}: missing YAML frontmatter (Trae subagents require name/description)`)
      continue
    }
    const nameMatch = fm.match(/^name:\s*(\S+)\s*$/m)
    if (!nameMatch) report(`${rel}: frontmatter missing name`)
    else if (!AGENT_NAME_RE.test(nameMatch[1]))
      report(
        `${rel}: agent name "${nameMatch[1]}" violates the official shape (letter first, letters/digits/hyphens, <=50)`,
      )
    if (!hasField(fm, 'description'))
      report(`${rel}: frontmatter missing description (dispatch trigger)`)
    const toolsMatch = fm.match(/^tools:\s*(.+)$/m)
    if (toolsMatch && toolsMatch[1].split(',').some((t) => t.trim() === '')) {
      report(`${rel}: tools must be a comma-separated list without empty entries`)
    }
  }
  const skillRoots = ['.trae/skills', '.agents/skills']
  for (const skillRoot of skillRoots) {
    const skillsDir = path.join(ROOT, skillRoot)
    if (!fs.existsSync(skillsDir)) continue
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const skillMd = path.join(skillsDir, entry.name, 'SKILL.md')
      if (!fs.existsSync(skillMd)) {
        report(`${skillRoot}/${entry.name}: directory has no SKILL.md (Agent Skills spec)`)
        continue
      }
      const rel = path.relative(ROOT, skillMd).replace(/\\/g, '/')
      const content = fs.readFileSync(skillMd, 'utf8')
      const fm = frontmatterOf(content)
      if (fm === null) {
        report(`${rel}: missing YAML frontmatter (Agent Skills spec requires name/description)`)
        continue
      }
      const nameMatch = fm.match(/^name:\s*(\S+)\s*$/m)
      if (!nameMatch) report(`${rel}: frontmatter missing name`)
      else if (nameMatch[1] !== entry.name)
        report(
          `${rel}: skill name "${nameMatch[1]}" must match the parent directory "${entry.name}"`,
        )
      else if (!SKILL_NAME_RE.test(nameMatch[1]) || nameMatch[1].length > 64)
        report(`${rel}: skill name "${nameMatch[1]}" violates the kebab-case/length constraints`)
      const descMatch = fm.match(/^description:\s*(.+)$/m)
      if (!descMatch || descMatch[1].trim() === '')
        report(`${rel}: frontmatter missing description`)
      else if (descMatch[1].length > 1024) report(`${rel}: description exceeds 1024 chars`)
    }
  }
  try {
    const mcp = JSON.parse(read('.trae/mcp.json'))
    if (typeof mcp.mcpServers !== 'object' || mcp.mcpServers === null) {
      report('.trae/mcp.json: missing mcpServers object')
    }
  } catch (err) {
    report(`.trae/mcp.json is not valid JSON: ${err.message}`)
  }
}
checkHarnessAssets()

if (violations.length > 0) {
  for (const v of violations) console.error(v)
  console.error(`[verify-gates] FAILED (${violations.length} violation(s))`)
  process.exit(1)
}
console.log(`[verify-gates] OK (${cjsFiles.length} scripts, hooks.json checked, hook smoke passed)`)
