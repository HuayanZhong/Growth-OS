# Design — Harness Hardening

## Context

The harness has three hook scripts (guard / regen / Stop reminder) wired in `.trae/hooks.json`, a gate self-check (`scripts/verify-gates.cjs`) with five checks (syntax, hooks.json structure, empty-stdin smoke, budget-manifest sanity, frontmatter audit incl. mcp.json), and a docs gate that enforces word budgets only for human docs (`scripts/doc-budgets.manifest.json` → `verify-docs`). OpenSpec assets were generated for four platforms (`openspec init --tools "trae,agents,opencode,claude"`); platform command files legitimately differ in frontmatter (`.claude` carries `allowed-tools`/tags, `.opencode` only `description`) while bodies match. The IPC contract in `packages/types/src/utils/ipc-channels.ts` is type-derived: one `IpcChannelMap` entry fans out to main (`handleIpc`), preload (`invokeIpc`), and `window.desktop` (`DesktopAPI`) at compile time.

Prior decisions in this area: [2026-09-08-trae-harness-expansion.md](../../../../.agents/notes/implemented/feature/2026-09-08-trae-harness-expansion.md) (harness three-layer model), [2026-09-08-agent-automation.md](../../../../.agents/notes/implemented/feature/2026-09-08-agent-automation.md) (M1–M4 delivered), [2026-09-08-openspec-integration.md](../../../../.agents/notes/implemented/feature/2026-09-08-openspec-integration.md) (four-platform generation), [2026-09-08-user-profile.md](../../../../.agents/notes/implemented/feature/2026-09-08-user-profile.md) (profile rule/data split).

## Goals / Non-Goals

**Goals:**

- The harness verifies its own behavior, not just its syntax (fixture-driven hook tests).
- Silent drift and silent bloat become gate failures (platform drift check, harness word budgets).
- Rule coverage matches the stack: the desktop/Electron layer gets its domain rule.
- Knowledge-source precedence is explicit: project rules beat vendored skills.

**Non-Goals:**

- No changes to hook wiring semantics (`hooks.json` event groups stay as-is), no new hook events.
- No Bash-command PreToolUse guard, no cross-platform rule portability, no OpenSpec-vs-Note policy line (deferred open questions from the review).
- No app-layer code changes; no new dependencies (all gate code stays zero-dependency `.cjs`).

## Decisions

**D1 — Drift check compares normalized content, not raw files.** Strip frontmatter, normalize line endings, drop platform-specific argument-passing placeholder lines (OpenCode's `**Provided arguments**: $ARGUMENTS`), normalize invocation tokens (`/opsx-apply` vs `/opsx:apply` vs `/openspec-apply-change`), and collapse markdown formatting (blank lines, per-line indentation) — the CLI deliberately rewrites each platform's markdown, so only wording drift must survive normalization. Alternatives: raw file hash (rejected — everything false-positives); line-exact body compare (rejected — first run showed 18 false positives from CLI markdown rewriting). The logical-asset map pairs `opsx-<name>` commands across `.trae/commands`, `.opencode/commands`, `.claude/commands/opsx/<name>` and the `openspec-*` skills across `.trae/skills` and `.agents/skills`. Failure message points to `openspec init --tools "trae,agents,opencode,claude"` as the regeneration path; new platform boilerplate discovered by a false positive extends the normalization list.

**D2 — Harness budgets live in verify-gates, manifest gains a `harness` section.** Human-doc budgets stay in verify-docs; harness assets are the gates' domain (mirrors where the frontmatter audit lives). `doc-budgets.manifest.json` gains a `harness` map (same `{ maxWords }` shape). The gate walks `.trae/rules/**/*.md`, `.trae/documents/*.md`, `.agents/user-profile.md` and fails on over-budget **or missing entry** (missing entry = unbudgeted asset = failure — this is the forcing function; verify-docs's manifest walk does the inverse, which is why it lives in a different check). Thresholds: measure current sizes at apply time, budget = current rounded up to the next 50 with ~20% headroom, floor 150 words.

**D3 — Hook fixtures are inline payloads in verify-gates.** No fixture files; each test builds the stdin JSON object inline (mirrors the documented protocol in [hooks.md](../../../../.trae/rules/agent/hooks.md)). Guard fixtures reference real harness paths (read-only — the hook decides, nothing is written). Regen fixture targets a mapped source whose generator is idempotent (`session-events.ts` → `generate:events` rewrites `docs/event-catalog.md` identically when sources are clean; a stale catalog would surface in verify:docs anyway). Stop-reminder dedup test pre-seeds the tmpdir state file inside the window, then cleans up.

**D4 — Desktop domain gets one rule: `desktop/ipc-contract.md`.** Not under `frontend/` (desktop-core is its own layer with its own docs). Content: channel-addition flow (type map first → main handler → preload/renderer derive), secureStore for sensitive persistence, launchEnv whitelist is non-secret only. Machine checks stay out of verify-invariants — the type map already enforces three-end sync at compile time; duplicating that in a grep-based gate would add noise without catching anything typecheck misses. The rule's value is procedural + security convention. AGENTS.md rules index and `docs/guide-zh.md` gain the new group (guide-zh budget 1140 — headroom checked at apply).

**D5 — Skill precedence is one AGENTS.md line, not per-skill edits.** Editing 40+ vendored rule files (or vendored SKILL.mds) is unmaintainable and blocks upstream updates. One line in the Skills section (~25 words) settles precedence globally: vendored skills are generic references; project rules win on conflict. Example named in review: nestjs-best-practices' class-validator/DTO guidance vs the zod + ZodValidationPipe rule.

**D6 — Behavior probes extend rule-decay-audit instead of a new skill.** One audit entry point; probes are audit-adjacent (periodic, recorded, manual-by-design). Probe matrix: (a) rule activation — sample rules per domain, perform a matching micro-task, confirm the description fires; (b) expert dispatch — for each of the four agents, a probe prompt whose description matches, observe whether Trae offers dispatch (platform gives no programmatic dispatch API — this probe needs the user watching); (c) skill loading — name a task that matches a skill description, confirm on-demand load. Results recorded in the audit output.

**D7 — Closing-review wording fix is enforced, not just corrected.** Reword the Stop-hook reason to "four questions" (matching self-improvement.md §3) and have the Stop fixture assert the four channel markers (skill/note/profile/friction) — future wording edits that drop a channel fail the gate instead of rotting silently.

**D8 — Note–OpenSpec integration is a thin-pointer policy, not a merge and not dual-track.** Alternatives: design.md replaces notes entirely (rejected — `.agents/notes/` is the chronological discovery index agents scan for prior decisions, and config.yaml's design rule depends on it); status quo (rejected — a full note would duplicate the design decisions, two homes for one fact). Policy: OpenSpec-planned changes ship a thin note (one-sentence summary + link); the full "why" lives in proposal/design and is archived with the change; non-OpenSpec changes keep full notes unchanged. Mechanics: one line in `.agents/notes/README.md` (contract) + one line in AGENTS.md documentation rules; the `/opsx-archive` step updates the note's link to the archived location — the verify-docs dead-link check is the machine backstop (a stale post-archive link fails the gate). This change's own note (task 6.2) becomes the first thin-pointer note.

## Risks / Trade-offs

- [Fixture payloads couple the gate to the Trae hook protocol shape] → payload construction mirrors hooks.md's documented protocol; a protocol change breaks verify-gates loudly, which is desirable (better than hooks silently no-op).
- [Regen fixture runs a real generator] → generator is idempotent and deterministic; if sources are clean the rewrite is a no-op diff. If it ever becomes non-idempotent, verify:docs catches the stale/impossible output.
- [AGENTS.md and guide-zh.md are near their budgets (1600 / 1140 words)] → D4/D5 additions are minimal (~50 words total); verify-docs fails loudly if over, forcing tightening instead of silent growth.
- [Manual probes need user participation (dispatch observation)] → probes are explicitly marked manual in the skill; they run at decay-audit cadence, not per-commit.
- [Drift check fails right after a legit partial regeneration] → failure message carries the exact `openspec init --tools` command; regenerating all four platforms is one command.

## Migration Plan

Additive only: new checks extend verify-gates (check functions append to the existing sequence), new rule file, one AGENTS.md line, manifest section, skill section, two text corrections. No rollback concerns beyond `git revert`. Order in tasks keeps the gate green at every step (wording/plan fixes first, budgets+drift checks land together with their thresholds measured, fixtures last so they test the already-corrected hook).
