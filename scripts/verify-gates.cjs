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
