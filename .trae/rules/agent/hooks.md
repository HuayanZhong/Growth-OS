---
alwaysApply: false
description: Trae hooks authoring rule: hook scripts (.trae/hooks.json + scripts/hook-*.cjs) follow the official event lifecycle (PreToolUse/PostToolUse/Stop), the stdin/stdout JSON protocol, defensive parsing, and machine-decidable checks only. Use when adding, modifying, or debugging hooks.
---

# Trae Hooks (Lifecycle, Protocol, Authoring)

**When to use**: when adding or modifying hooks in `.trae/hooks.json` or `scripts/hook-*.cjs`.

## 1. Event lifecycle

| Event         | Fires                                             | stdin extras                           | Blocking semantics                                                                      |
| ------------- | ------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| `PreToolUse`  | before a tool runs (`matcher` filters tool names) | `tool_name`, `tool_input`              | block JSON prevents the tool call; `reason` is fed back to the agent                    |
| `PostToolUse` | after a tool completes                            | `tool_name`, `tool_input`, tool result | validation/reporting only                                                               |
| `Stop`        | when the agent ends its turn                      | turn/transcript context                | block JSON re-invokes the agent with `reason` as a new request; guard with `loop_limit` |

Common stdin fields: `session_id`, `cwd`, `hook_event_name`, `workspace_roots`. Outbound protocol: stdout JSON `{ decision: "block", reason: string }`, or silent exit 0 to allow. Unknown/partial stdin must never crash a hook.

## 2. Configuration

- Project hooks live in `.trae/hooks.json` (`version: 1`); global hooks at `~/.trae-cn/hooks.json` are merged by Trae — this repo only maintains the project file.
- `matcher` applies to `PreToolUse`/`PostToolUse`/`Notification` only; `Stop` groups use `loop_limit` (default 5) against re-entry loops.

## 3. Authoring rules

1. **Machine-decidable checks only**: format validation, thresholds, state dedup — semantic judgment (what to extract, what it means) belongs to the agent guided by rules, not the hook.
2. **Defensive parsing**: unreadable/missing stdin, missing fields, or unexpected shapes → exit 0 (allow). A broken hook must never wedge the agent.
3. **Zero dependencies, `.cjs`**, mirroring `scripts/verify-*.cjs` style; `timeout` set (≤15s for guards).
4. **State dedup for `Stop` hooks**: persist a timestamp under `os.tmpdir()` and skip re-reminding within the window; `loop_limit` is the second guard.
5. **Block reasons must be actionable**: name the violated rule file and the exact fix, so the agent can comply in one pass.
6. **Scope discipline**: hooks enforce format/threshold invariants; they never make product decisions or restate rules.

## 4. Inventory

- `scripts/hook-guard-harness.cjs` (`PreToolUse`, `Write|Edit`): harness asset frontmatter validation (rules `alwaysApply`/`description`; agents `name`/`description`/`tools`; SKILL.md name = parent directory).
- `scripts/hook-user-profile-reminder.cjs` (`Stop`): end-of-turn user-profile review reminder with 6h dedup (see [user-profile.md](user-profile.md) §6).

## 5. Verification

```bash
echo '{"hook_event_name":"Stop"}' | node scripts/hook-user-profile-reminder.cjs
# first call blocks with a review reason; second call within 6h allows silently
node -e "JSON.parse(require('fs').readFileSync('.trae/hooks.json','utf8'))"
# config stays valid JSON
```
