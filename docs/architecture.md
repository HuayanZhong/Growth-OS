# Architecture map

Growth OS is a Coze-like AI agent desktop platform. This map describes current composition and data flow; read it before changing `packages/`. Detail and rationale live in the linked documents, not here.

## Tech stack

| Layer                 | Choice                                      |
| --------------------- | ------------------------------------------- |
| Desktop shell         | Electron 43 (`packages/desktop-core`)       |
| Frontend              | Nuxt 4 + Vue 3 + Vite (`apps/desktop`)      |
| CSS / UI              | Tailwind CSS v4 + daisyUI 5 (`packages/ui`) |
| Backend               | NestJS + MikroORM (`apps/server`)           |
| Auth / DB             | Supabase Auth + PostgreSQL                  |
| Build                 | Turborepo + pnpm workspaces (catalogs)      |
| Lint / format / tests | oxlint + oxfmt + Vitest                     |

## Package topology

```
@growth-os/shared     (env/normalize helpers, zero deps)
@growth-os/types      (shared types, IPC channel contracts)
@growth-os/ui         (design-system components + styles, daisyUI)
@growth-os/desktop-core (Electron main/preload, standalone)
        ↑
apps/desktop          (Nuxt 4; depends on shared, types, ui, desktop-core)
apps/server           (NestJS; depends on shared)
```

Shared configs live in `tooling/`: layered TypeScript presets (`tooling/typescript/`, see [typescript-config.md](architecture/typescript-config.md)), oxlint rules, oxfmt rules, Vitest base.

## Layers and data flow

1. **Presentation** (`apps/desktop/app/`): pages, layouts, components, composables. State is kept in composables (`useAuth`, `useSupabase`, `useSecureStorage`, `useToast`); auth flows are governed by `.trae/rules/frontend/auth/`.
2. **Bridge** (`packages/desktop-core/`): Electron main process + preload, exposing a minimal `window.desktop` API via `contextBridge` (`contextIsolation: true`, `nodeIntegration: false`). IPC channels are typed in `packages/types/src/utils/ipc-channels.ts`.
3. **API** (`apps/server/`): NestJS modules (auth, agent, chat), guarded by `auth.guard` + DTO validation; MikroORM entities map to Supabase PostgreSQL (config and workflow: [database.md](server/database.md)).
4. **Data** (Supabase): Auth handles identity; PostgreSQL stores profiles/agents/conversations/messages; RLS enforces per-user isolation.
5. **UI packages** (`packages/ui/`): reusable components and semantic style tokens (see `.trae/rules/frontend/styles/`).

```
user → Vue component → composable → IPC (window.desktop) → desktop-core handlers
                                 └→ @growth-os/types (typed channels)
                                 └→ HTTP → NestJS → MikroORM → Supabase PostgreSQL
```

## Key mechanisms

- **Auth**: supabase-js client injects secureStorage for token persistence; PII is stripped before storage; login state comes from `getSession()`; sign-out falls back to local-only on expired/403 sessions. See [flows.md](../.trae/rules/frontend/auth/flows.md) and [token.md](../.trae/rules/frontend/auth/token.md).
- **Env**: dotenv-cli cascade — `pnpm dev` loads `.env` + `.env.development`, `pnpm build`/`start` load `.env` + `.env.production`. Client-visible keys are `NUXT_PUBLIC_*` (inlined at build).
- **Electron + Nuxt integration**: `apps/desktop/modules/electron.ts` compiles main/preload via vite-plugin-electron and starts Electron in dev; production build compiles only (electron-builder packages). Frontend/shell mechanisms (auth, IPC, styles, tests): [desktop/architecture.md](desktop/architecture.md).
- **Animations**: manual GSAP + timeline for component switches (Vue `Transition mode="out-in"` + JS hooks is broken under Nuxt 4); see [animation.md](../.trae/rules/frontend/styles/animation.md).
- **Database (server)**: MikroORM via `apps/server/mikro-orm.config.ts`, connecting with the session pooler string; migrations and seeders live in `infra/database/` and run through the `mikro-orm:*` scripts. See [database.md](server/database.md).

## Change guidance

- New feature in `packages/` → read this map first, then the owning package README and the relevant `.trae/rules/` file.
- Architecture decisions and rejected alternatives → write an Agent Note in `.agents/notes/` in the same change (see [notes README](../.agents/notes/README.md)).
