## 1. Cosmetic and decay fixes

- [x] 1.1 Reword the Stop-hook reminder reason in `scripts/hook-user-profile-reminder.cjs` from "三问" to "四问" and align enumeration with `.trae/rules/agent/self-improvement.md` §3 — verify: pipe a Stop-event fixture (`{"hook_event_name":"Stop",...}`) into the script and confirm the block reason lists all four channels
- [x] 1.2 Correct the stale status line in `.trae/documents/lightweight-automation-plan.md` (M1–M4 delivered) — verify: `pnpm verify:docs`

## 2. Rule coverage and precedence

- [x] 2.1 Create `.trae/rules/desktop/ipc-contract.md` (Trae rule frontmatter; channel-addition flow from `IpcChannelMap`, secureStore for sensitive data, launchEnv non-secret-only constraint) — verify: `pnpm verify:gates` (frontmatter audit passes)
- [x] 2.2 Register the desktop group in the AGENTS.md rules index and `docs/guide-zh.md` index (watch the 1140-word guide-zh budget) — verify: `pnpm verify:docs` (links + budgets green)
- [x] 2.3 Add the vendored-skill precedence line to the AGENTS.md Skills section (vendored skills are generic references; project rules win on conflict) — verify: `pnpm verify:docs` (AGENTS.md stays within 1600 words)

## 3. Gates: harness budgets and platform drift

- [x] 3.1 Add a `harness` section to `scripts/doc-budgets.manifest.json` covering all `.trae/rules/**/*.md`, `.trae/documents/*.md`, `.agents/user-profile.md`; measure current word counts and set budgets (round up to next 50, ~20% headroom, floor 150) — verify: `pnpm verify:gates` (manifest sanity passes)
- [x] 3.2 Extend `scripts/verify-gates.cjs` with the harness budget walker (fails on over-budget AND on missing entry) — verify: negative test (add an over-budget asset / remove an entry → gate fails naming the file), then restore → gate passes
- [x] 3.3 Extend `scripts/verify-gates.cjs` with the platform drift check (frontmatter-stripped, line-ending-normalized body comparison across `.trae/commands`, `.opencode/commands`, `.claude/commands/opsx/`, and the `openspec-*` skills in `.trae/skills` vs `.agents/skills`; failure message carries `openspec init --tools "trae,agents,opencode,claude"`) — verify: negative test (edit one platform copy's body → gate fails naming the pair), restore → gate passes

## 4. Hook behavior fixtures in verify-gates

- [x] 4.1 Guard fixtures: PreToolUse payload on a harness-asset path → block decision; payload on an application path → exit 0 without block — verify: `pnpm verify:gates`; negative test (neutralize the guard path check → fixture fails)
- [x] 4.2 Regen fixtures: PostToolUse payload for a registered source (`packages/shared/src/session-events.ts`) → mapped generator runs (idempotent, `git status` clean afterwards); payload for an unregistered path → no generator, exit 0 — verify: `pnpm verify:gates` then `git status` shows no unexpected diff
- [x] 4.3 Stop fixtures: Stop event outside dedup window → block with reason containing skill/note/profile/friction markers; second call inside the pre-seeded dedup window → exit 0; tmpdir state restored afterwards — verify: `pnpm verify:gates`

## 5. Audit skill and one-time E2E probes

- [x] 5.1 Extend `.trae/skills/rule-decay-audit/SKILL.md` with the behavior-probe matrix: rule activation spot checks (sampled rules per domain), dispatch probes for all four experts (frontend-auth / frontend-style / frontend-test / server-architect), skill loading probe; probes marked manual-by-design (platform exposes no dispatch API) — verify: `pnpm verify:gates` (frontmatter) + review body
- [ ] 5.2 Run the probe matrix once with the user observing subagent dispatch behavior; record pass/fail per probe and feed failures into the decay-audit backlog — verify: recorded results per probe (manual; requires user participation)

## 6. Wrap-up

- [ ] 6.1 Full regression: `pnpm verify` (invariants + docs + gates) plus `pnpm test` → `pnpm typecheck` → `pnpm lint` → `pnpm hygiene` — verify: all green
- [x] 6.2 Ship the first thin-pointer Agent Note `.agents/notes/implemented/feature/2026-09-09-harness-hardening.md` per the D8 policy: one-paragraph summary + link to `openspec/changes/harness-hardening/`, no decision duplication (design.md holds D1–D8) — verify: note exists, `pnpm verify:docs` green
- [x] 6.3 Define the integrated note policy: add the thin-pointer rule to the note contract (`.agents/notes/README.md`) and one policy line to the AGENTS.md documentation rules (OpenSpec-planned changes → thin note; non-OpenSpec changes → full note; archive updates the link) — verify: `pnpm verify:docs` green
- [x] 6.4 At `/opsx-archive`: update the note's link to the archived change location — verify: `pnpm verify:docs` green post-archive (no dead links)
