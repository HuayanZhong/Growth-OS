#!/usr/bin/env node
/**
 * Trae Stop hook: end-of-turn user-profile review reminder.
 *
 * When the agent finishes a turn, block once (reason fed back as a new request) asking
 * it to review the turn's interaction signals per .trae/rules/agent/user-profile.md §6 —
 * update .agents/user-profile.md if stable preferences/corrections/decision patterns
 * emerged, otherwise ignore the reminder and end normally.
 *
 * Dedup: a reminder is emitted at most once per 6h (timestamp under os.tmpdir());
 * loop_limit in .trae/hooks.json is the second guard against re-entry loops.
 * Defensive: any parse failure or missing field exits 0 (allow).
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const WINDOW_MS = 6 * 60 * 60 * 1000
const STATE_FILE = path.join(os.tmpdir(), 'growth-os-profile-review.json')

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

function remindedRecently() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    return typeof state.lastReminded === 'number' && Date.now() - state.lastReminded < WINDOW_MS
  } catch {
    return false
  }
}

function markReminded() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastReminded: Date.now() }))
  } catch {
    // state is best-effort; failing to persist just means the next Stop reminds again
  }
}

const event = readStdin()
if (!event || event.hook_event_name !== 'Stop') process.exit(0)
if (remindedRecently()) process.exit(0)
markReminded()

process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason:
      '任务收尾：按 .trae/rules/agent/user-profile.md §6 审视本轮交互信号——若出现新的稳定偏好、纠正、决策模式或边界反馈，更新 .agents/user-profile.md 对应条目（带 evidence、last_updated、置信度）；若无新信号，忽略本提醒并正常结束。',
  }),
)
process.exit(0)
