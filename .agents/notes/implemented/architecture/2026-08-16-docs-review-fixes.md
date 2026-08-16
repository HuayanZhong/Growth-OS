# Agent Note: docs review fixes

Status: implemented

## Problem

A full-system review of the doc architecture (via the TRAE-code-review skill, cross-checked by two sub-agents) confirmed seven issues: `typescript-config.md` described a fabricated preset layout; `architecture.md` presented planned modules/entities as shipped; `desktop` was wrongly listed as depending on `@growth-os/shared` in three places; the docs gate only checked links for six managed files and ignored per-layer `CLAUDE.md` pointers; and two index/contract files missed entries and layer coverage.

## Decision/Proposal

Fix all seven findings in one pass:

- **Reality-first docs.** `docs/architecture/typescript-config.md` rewritten to the actual `tooling/typescript/` layout (base → runtime/{browser,node} → framework/\*), with the real project inheritance table and unused presets called out. `docs/architecture.md` layers 3–4 now state current facts (no business modules or entities yet; RLS planned, not applied) instead of the planned `(auth, agent, chat)` modules and `profiles/agents/conversations/messages` tables.
- **Dependency correction.** `docs/architecture.md` topology, `apps/README.md` (EN + ZH), and `packages/shared/AGENTS.md` now state that `desktop` depends on `types`/`ui`/`desktop-core` while only `server` imports `shared`.
- **Wider docs gate.** `scripts/verify-docs.cjs` link-check coverage extends from six managed files to every markdown file under the repo (recursive glob minus `node_modules/.git/.trae/.agents/dist/coverage/.nuxt/.output`), and adds a per-layer `CLAUDE.md` thin-pointer check (must link sibling + root `AGENTS.md`). `scripts/doc-budgets.manifest.json` adds budgets for the root/`apps`/`packages`/`tooling` READMEs and the `database.md`/`desktop` architecture docs.
- **Index/contract fixes.** `docs/guide-zh.md` gains the English `desktop/architecture.md` entry; `docs/i18n/README.md` spells out that `AGENTS.md`/`CLAUDE.md` are English-only at every layer (root/`apps/`/`packages/`/`tooling/`).

## Alternatives considered

- **Listing every README in the budgets manifest** for link coverage — rejected: 22+ files would bloat the manifest; a recursive glob covers existing and future docs with one rule.
- **Enforcing one exact template for per-layer `CLAUDE.md`** — rejected: layer wording differs by design; a structural check (sibling + root `AGENTS.md` links present) catches real drift without forcing rewrites.
- **Budgeting Chinese mirrors too** — rejected: mirrors are already governed by the pairing hash; double-gating adds no protection.

## Consequences

- `pnpm verify:docs` now catches dead links in any markdown file, non-root `CLAUDE.md` pointer drift, and word-budget growth in the README/architecture tier, in addition to the existing checks.
- Bilingual pairs touched by this change (`docs/architecture`, `apps/README`) were re-recorded via `pnpm verify:pairing --write`.
- All 13 pairs recorded; the docs gate passes (`[verify-docs] OK`).
