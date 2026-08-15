# Growth OS — Agent Guide

Growth OS is a Coze-like desktop platform built with Nuxt 4 (frontend), NestJS (backend), Electron (shell), and Supabase (auth/database), orchestrated by Turborepo + pnpm workspaces. This file is the single source of truth for agent behavior; `CLAUDE.md` is a thin pointer to this file.

## Repository layout

| Path                    | Role                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| `apps/desktop`          | Nuxt 4 frontend + Electron shell app (`app/` source, `modules/`, `test/`) |
| `apps/server`           | NestJS backend with MikroORM (`src/`)                                     |
| `packages/desktop-core` | Electron main process + preload (`src/main.ts`, `src/preload.ts`)         |
| `packages/ui`           | Design system components and styles (Tailwind CSS v4 + daisyUI 5)         |
| `packages/shared`       | Shared env/normalize utilities                                            |
| `packages/types`        | Shared types and IPC channel contracts                                    |
| `tooling/`              | Shared TypeScript / lint / format / test configs                          |
| `docs/`                 | Human-facing docs (architecture map, Chinese guide, doc standard)         |
| `.trae/`                | Trae harness: `rules/`, `agents/`, `skills/`, `documents/`, `mcp.json`    |
| `.agents/`              | Agent Skills (`skills/`) and decision notes (`notes/`)                    |
| `scripts/`              | Repo scripts including `verify-docs.cjs` (docs gate)                      |

## Commands

Run from the repo root; turbo runs the matching script in every package.

- `pnpm dev` / `pnpm start` / `pnpm build` — dev / production start / build (dotenv cascade, see Secrets)
- `pnpm lint` / `pnpm format` / `pnpm typecheck` / `pnpm test` — verification suite
- `pnpm verify:docs` — docs gate: mirror consistency, markdown links, word budgets
- `pnpm --filter desktop test` — run desktop tests only (`vitest run`); single file: `pnpm --filter desktop vitest run test/unit/use-auth.test.ts`
- `pnpm --filter desktop verify:build` — Electron production build smoke test
- `pnpm --filter server typecheck` — backend typecheck

Before reporting a task done, run `test` → `typecheck` → `lint` and confirm green.

## Rules (.trae/rules)

English single source of truth, loaded on demand. Chinese readers use the index in `docs/guide-zh.md` (never restate rule text).

- **Auth** (`frontend/auth/`): [credentials.md](.trae/rules/frontend/auth/credentials.md) (test accounts only in root `.env`), [flows.md](.trae/rules/frontend/auth/flows.md) (login/sign-out/403 fallback), [token.md](.trae/rules/frontend/auth/token.md) (secureStorage session persistence)
- **Styles** (`frontend/styles/`): [animation.md](.trae/rules/frontend/styles/animation.md) (GSAP, no Vue Transition out-in), [colors.md](.trae/rules/frontend/styles/colors.md) (semantic tokens only), [conflict.md](.trae/rules/frontend/styles/conflict.md) (external overrides via `cn()`), [fonts.md](.trae/rules/frontend/styles/fonts.md) (local bundles, unicode-range), [performance.md](.trae/rules/frontend/styles/performance.md), [responsive.md](.trae/rules/frontend/styles/responsive.md), [reuse.md](.trae/rules/frontend/styles/reuse.md) (extract UI components at 3+ uses), [structure.md](.trae/rules/frontend/styles/structure.md), [themes.md](.trae/rules/frontend/styles/themes.md) (theme-controller, never lock data-theme)
- **Tests** (`frontend/tests/`): [assertions.md](.trae/rules/frontend/tests/assertions.md) (no non-null assertions, no `any`), [commands.md](.trae/rules/frontend/tests/commands.md) (test → typecheck → lint order), [coverage.md](.trae/rules/frontend/tests/coverage.md), [environment.md](.trae/rules/frontend/tests/environment.md) (@nuxt/test-utils runtime), [isolation.md](.trae/rules/frontend/tests/isolation.md), [mock.md](.trae/rules/frontend/tests/mock.md) (never call real services), [structure.md](.trae/rules/frontend/tests/structure.md)
- **Git**: [git-commit-message.md](.trae/rules/git-commit-message.md) (conventional commits, subject language matches the change)

## Agents (.trae/agents)

On-demand experts, triggered by description: [frontend-auth-expert.md](.trae/agents/frontend-auth-expert.md), [frontend-style-expert.md](.trae/agents/frontend-style-expert.md), [frontend-test-expert.md](.trae/agents/frontend-test-expert.md).

## Skills

`.agents/skills/` (Agent Skills spec) and `.trae/skills/` (Trae project skills) load on demand by `description`; do not read skill bodies unless the task matches.

## Human docs (docs/)

- [AGENTS.md](docs/AGENTS.md) — documentation standard: tier taxonomy, writing rules, slop checklist
- [architecture.md](docs/architecture.md) — architecture map; read before changing `packages/`
- [guide-zh.md](docs/guide-zh.md) — Chinese navigation index (index only, never restates rules)

## Decisions (.agents/notes/)

Agent Notes record the "why": [README.md](.agents/notes/README.md) defines the contract. Non-trivial changes ship a note in the same change.

## Secrets and .env

- Test accounts live only in the root `.env` (`SUPABASE_TEST_EMAIL`, `SUPABASE_TEST_PASSWORD`); never hard-code them into code, tests, rules, or commits; rules reference variable names only.
- Env loads via dotenv-cli cascade: `pnpm dev` → `.env` + `.env.development`; `pnpm build`/`start` → `.env` + `.env.production`.
- Never commit `.env*`, cert passwords (`CSC_KEY_PASSWORD`), or `GH_TOKEN`.

## Documentation rules (core four)

1. **One fact, one home.** A statement lives in exactly one file; elsewhere, link to it. Duplicates are violations, not conveniences.
2. **Document current state, not history.** No "previously / now / no longer" or PR narration in durable prose; put change stories in commits, Agent Notes, or postmortems.
3. **Cross-reference with relative markdown links**, never bare filenames (machine-checked by `verify-docs`).
4. **Every non-trivial change ships an Agent Note** (proposed or implemented) in the same change.

## Editing these instructions

Edit `AGENTS.md` only; `CLAUDE.md` is a thin pointer, repaired by `node scripts/verify-docs.cjs --sync` when it drifts. Update `docs/guide-zh.md`'s index when the structure above changes.
