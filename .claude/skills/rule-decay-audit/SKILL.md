---
name: rule-decay-audit
description: Audit the Trae harness (.trae/rules, .trae/agents, AGENTS.md, human docs) for decay — rule assertions that no longer match the code (renamed frameworks, moved paths, stale versions, inverted API semantics), missing index entries, and broken bilingual mirrors. Fix drift in place and re-verify. Use when the user asks to review rules/docs for rot, after a big migration (test framework swap, major dependency bump, ESM switch), or periodically as harness maintenance.
---

Systematic decay audit of the harness: every rule assertion is checked against the code it describes, drift is fixed at the source, and the bilingual/index contracts are re-verified. The machine gates (`verify:docs` for links/budgets/pairs, `verify:invariants` for structural checks) run first; this audit covers what they cannot — semantic drift between prose and code.

## Process

### 1. Inventory the harness assets

List the audit surface:

- `.trae/rules/**/*.md` — domain rules (English source of truth)
- `.trae/agents/*.md` — on-demand experts
- `AGENTS.md` (root) — standing orders + rules/agents index
- `docs/architecture.md` / `docs/server/database.md` / `docs/desktop/architecture.md` — human detail docs
- `docs/guide-zh.md` — Chinese navigation index

### 2. Extract verifiable anchors from every rule

For each rule file, list claims that can be checked against code — exact commands, API names, file paths, package versions, config keys. Examples of anchor classes:

- **Tooling claims**: which test runner, which formatter flags (e.g. a rule saying `jest.mock` when tests use Vitest is decayed).
- **API semantics**: direction and shape of described mechanisms (e.g. a map described as code → status when the implementation is status → code).
- **Placement claims**: where entities/tests/migrations live, versus the real tree.
- **Version claims**: hard versions in prose (e.g. "Electron 43") versus `pnpm-workspace.yaml` catalogs.
- **Path claims**: config paths quoted in docs versus the actual config file.
- **Example fidelity**: code examples in rules must mirror the real pattern (decorator-style entities vs `defineEntity`), because agents copy them.

Grep and run commands to verify each anchor. Anchor-less prose (pure principle) is out of scope — only checkable claims are audited.

### 3. Fix drift at the source

- Rules are English SSOT: fix the `.trae/rules/**` file, never a mirror.
- Human docs with Chinese mirrors: change both sides in the same change, then re-record the pair hash with `pnpm verify:pairing --write <path>`.
- Update `docs/guide-zh.md` when rule files are added/removed/renamed (index only, no restatement).
- Keep the tier taxonomy: standing orders → root `AGENTS.md` (one line), domain detail → the owning rule, rationale → an Agent Note.
- Never add a rule for a one-off observation; only stable, recurring constraints become rules.

### 4. Check index completeness

Every file under `.trae/rules/**/*.md` and `.trae/agents/*.md` must be referenced from the root `AGENTS.md` (no orphan rules), and every index entry must resolve (machine-checked by `verify:docs` link validation).

### 5. Re-verify

```bash
pnpm verify:docs          # links, budgets, pair hashes, generated-doc freshness
pnpm verify:invariants    # structural checks still pass after any edits
```

Plus the relevant package test suites if rules reference behavior that changed.

### 6. Report

- Decayed assertions found (file:line, claim vs fact)
- Fixes applied (per file, incl. mirror + pairing re-records)
- Confirmed-still-accurate assets (brief)
- Suggested new rules (only if a stable gap emerged), with the tier they belong to

## Behavior probes (manual, run with the user)

Content audits cannot see runtime behavior — whether rules actually activate,
experts actually dispatch, and skills actually load. These probes are
manual-by-design: the platform exposes no dispatch/activation API, and the
dispatch probe requires watching the Trae UI. Run them at audit cadence and
record pass/fail per probe in the audit report; failures go to the decay-audit
backlog, not ad-hoc fixes.

### Probe matrix

1. **Rule activation** — sample one rule per domain (frontend/auth, frontend/styles,
   frontend/tests, desktop, server/*, agent). For each, phrase a micro-task whose
   wording matches the rule's `description` trigger and confirm the rule loads
   (the session shows the rule's guidance being applied or cited).
2. **Expert dispatch** — for each registered expert, use a prompt squarely inside
   its `description` and observe whether Trae offers/uses the subagent:
   - `frontend-auth-expert` — a login/token-flow frontend task
   - `frontend-style-expert` — a theming/style-conflict task
   - `frontend-test-expert` — a Vitest/Nuxt test task
   - `server-architect` — a NestJS/MikroORM backend task
3. **Skill loading** — name a task matching a skill `description` (e.g.
   "review this NestJS module for best-practice violations") and confirm the
   skill loads on demand and that project rules win where guidance conflicts
   (per the AGENTS.md precedence statement).
