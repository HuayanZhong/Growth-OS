# Harness Hardening

## Why

A systematic six-layer harness review (2026-09-09) found the gates/hooks/evolution layers solid but the harness does not verify itself: hook scripts are only smoke-tested on empty stdin (block and regenerate paths never exercised), harness assets (37 rules, 7 plans, user profile) have no size budgets, the multi-platform OpenSpec assets (.trae/.claude/.opencode/.agents) can drift silently, and the desktop/Electron layer — a core part of the stack — has zero dedicated rules. Two confirmed cosmetic/decay defects round it out.

## What Changes

Fixes (confirmed defects):

- Stop-hook reminder wording says "three questions" while enumerating four; align with the closing review in `.trae/rules/agent/self-improvement.md` §3
- Correct the stale status line in `.trae/documents/lightweight-automation-plan.md` (M1–M4 delivered, still says "M1–M3 in progress")

Structural gaps:

- New desktop rule domain (`.trae/rules/desktop/`): an IPC contract rule grounded in the type-derived `IpcChannelMap` (packages/types) — channel addition workflow, secureStore/launchEnv conventions (secrets never pass launchEnv)
- Skill precedence: one line in AGENTS.md Skills section — vendored skills under `.trae/skills/` are generic references; project rules win on conflict (e.g. nestjs-best-practices recommends class-validator/DTO, conflicting with the zod + ZodValidationPipe rule)
- Platform drift detection: `verify-gates` gains a check comparing generated OpenSpec assets across `.trae/`, `.claude/`, `.opencode/`, `.agents/` — body-level comparison (platform frontmatter legitimately differs)
- Harness word budgets: rules, plan documents, and the user profile get size budgets, enforced in `verify-gates` (keeps verify-docs focused on human docs)

Harness behavior verification (new):

- `verify-gates` hook checks upgraded from empty-stdin smoke to fixture-driven behavior tests: guard block path (harness-asset edit payload → `decision: block`), regen trigger path (event-catalog source payload → generator runs), Stop reminder path (block + four-question reason)
- `rule-decay-audit` skill gains a behavior-probe section: manual E2E matrix for rule activation (description-triggered firing), subagent auto-dispatch (do the four experts trigger), skill loading — run at decay-audit cadence
- Note–OpenSpec integration: the note contract (`.agents/notes/README.md`) and AGENTS.md define the combined flow — changes planned through the OpenSpec workflow ship a **thin Agent Note** (one-sentence summary + link to the change); the full rationale stays in the change's proposal/design (one fact, one home), non-OpenSpec changes keep full notes as today, and archiving a change updates the note's link (the docs gate catches stale links)

Out of scope (open questions from the review, deferred until the user decides): cross-platform rule portability, a Bash-command PreToolUse guard.

## Capabilities

### New Capabilities

- `agent-harness`: requirements for harness self-verification and governance — platform drift detection, harness asset word budgets, hook behavior tests, desktop IPC rule coverage, vendored-skill precedence, closing-review consistency, Agent Note / OpenSpec integration

### Modified Capabilities

(none — first change in the repo; no main specs exist yet)

## Impact

- Harness-layer only: `.trae/` (new rules domain, documents, skills), `.agents/notes/README.md` (note contract line), `scripts/verify-gates.cjs`, `AGENTS.md` (two lines: skill precedence + note policy, inside its 1600-word budget)
- This change **touches harness assets** (`.trae/`, `AGENTS.md`) and follows the stricter flow in docs/AGENTS.md via this proposal
- No app-layer changes (`apps/desktop`, `apps/server`, `packages/*` untouched — the desktop rule _references_ packages/types but changes no code); no new dependencies
- Verification entry point for the whole change: `pnpm verify` (invariants + docs + gates) plus the new fixture tests running inside `verify:gates`
