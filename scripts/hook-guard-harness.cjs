#!/usr/bin/env node
/**
 * Trae PreToolUse hook: validate harness asset frontmatter before the agent writes it.
 *
 * Scope (registered in .trae/hooks.json, matcher "Write|Edit"):
 *   - .trae/rules/ (all markdown)   → frontmatter must declare alwaysApply and description
 *   - .trae/agents/ (agent files)   → frontmatter must declare a valid name (letters/digits/hyphens,
 *                             starts with a letter, <=50 chars) and description; tools, when
 *                             present, is a comma-separated list
 *   - .trae/skills/ (SKILL.md)      → name must equal the parent directory (kebab-case) and
 *                             description must be present
 *
 * Protocol: reads the hook event JSON from stdin; emits {"decision":"block","reason":...}
 * on stdout for violations; exits 0 silently when the write is allowed or out of scope.
 * Only full-file Write events are fully validated; Edit events that touch these files are
 * validated post-hoc by the pre-commit gate (verify:docs orphan check + budgets).
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

function frontmatterOf(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return m ? m[1] : null
}

function hasField(fm, key) {
  return new RegExp(`^${key}:\\s*\\S`, 'm').test(fm)
}

const AGENT_NAME_RE = /^[A-Za-z][A-Za-z0-9-]{0,49}$/

function violationsFor(relFile, content) {
  const norm = relFile.replace(/\\/g, '/')
  const fm = frontmatterOf(content)
  const issues = []
  if (fm === null) {
    issues.push('missing YAML frontmatter (--- name/description ---)')
    return issues
  }
  if (norm.startsWith('.trae/rules/')) {
    if (!hasField(fm, 'alwaysApply'))
      issues.push('frontmatter must declare alwaysApply (true/false)')
    if (!hasField(fm, 'description'))
      issues.push('frontmatter must declare description (smart-activation trigger)')
  } else if (norm.startsWith('.trae/agents/')) {
    const nameMatch = fm.match(/^name:\s*(\S+)\s*$/m)
    if (!nameMatch) {
      issues.push('frontmatter must declare name')
    } else if (!AGENT_NAME_RE.test(nameMatch[1])) {
      issues.push(
        `agent name "${nameMatch[1]}" must start with a letter, use letters/digits/hyphens only, and be <= 50 chars`,
      )
    }
    if (!hasField(fm, 'description'))
      issues.push('frontmatter must declare description (dispatch trigger for the Agent)')
    const toolsMatch = fm.match(/^tools:\s*(.+)$/m)
    if (toolsMatch && toolsMatch[1].split(',').some((t) => t.trim() === '')) {
      issues.push('tools must be a comma-separated list without empty entries')
    }
  } else if (/^\.trae\/skills\/[^/]+\/SKILL\.md$/.test(norm)) {
    const dirName = path.basename(path.dirname(norm))
    const nameMatch = fm.match(/^name:\s*(\S+)\s*$/m)
    if (!nameMatch) {
      issues.push('frontmatter must declare name')
    } else if (nameMatch[1] !== dirName) {
      issues.push(
        `skill name "${nameMatch[1]}" must match the parent directory "${dirName}" (Agent Skills spec)`,
      )
    }
    if (!hasField(fm, 'description'))
      issues.push('frontmatter must declare description (on-demand activation)')
  }
  return issues
}

function allow() {
  process.exit(0)
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }))
  process.exit(0)
}

const event = readStdin()
if (!event || event.hook_event_name !== 'PreToolUse') allow()

const toolInput = event.tool_input ?? {}
const filePath = toolInput.file_path ?? toolInput.path
if (typeof filePath !== 'string' || filePath === '') allow()

// Full-file validation only on Write; Edit output is gated by pre-commit.
if (event.tool_name !== 'Write') allow()

const abs = path.isAbsolute(filePath) ? filePath : path.join(event.cwd ?? ROOT, filePath)
const rel = path.relative(ROOT, abs).replace(/\\/g, '/')
const inScope =
  rel.startsWith('.trae/rules/') ||
  /^\.trae\/agents\/[^/]+\.md$/.test(rel) ||
  /^\.trae\/skills\/[^/]+\/SKILL\.md$/.test(rel)
if (!inScope) allow()

let content = ''
try {
  content = toolInput.content ?? ''
} catch {
  content = ''
}
if (typeof content !== 'string' || content === '') allow()

const issues = violationsFor(rel, content)
if (issues.length > 0) {
  block(
    `Harness asset ${rel} violates the official asset format: ${issues.join('; ')}. ` +
      'Fix the frontmatter (see .trae/agents/, .trae/rules/ and .trae/skills/ siblings for conforming examples) before writing.',
  )
}
allow()
