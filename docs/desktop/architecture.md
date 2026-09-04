# Desktop — frontend & shell

English | [中文](architecture.zh.md)

Nuxt 4 frontend bundled into an Electron shell; the Electron main process/preload live in `@growth-os/desktop-core`. Run instructions, `app/` layout, and stack are in [apps/desktop/README.md](../../apps/desktop/README.md).

## Layers

```
apps/desktop          desktop UI (Nuxt 4 app)
  → @growth-os/ui        design system (Tailwind v4 + daisyUI)
  → @growth-os/desktop-core  Electron main + preload (packages/desktop-core)
  → @growth-os/types     shared types + IPC channel contracts (packages/types)
```

## Key mechanisms

- **Electron wiring**: `modules/electron.ts` compiles main/preload via vite-plugin-electron in dev and launches the window; production uses the packaged build.
- **Auth**: Supabase Auth through `useAuth` / `useSecureStorage` / `useSupabase`; session persisted via secureStorage, `middleware/auth.global.ts` guards routes. Login/sign-out/403 fallback follow `.trae/rules/frontend/auth/` (flows, token, credentials).
- **IPC**: channel names live in `@growth-os/types` (`ipc-channels.ts`); the preload exposes a minimal `window.desktop` via contextBridge; changing a channel updates `apps/desktop` and `@growth-os/desktop-core` in the same change.
- **Styles**: semantic color tokens, theme via theme-controller, GSAP animation, 3+ reuse extracted into `@growth-os/ui` — per `.trae/rules/frontend/styles/`.
- **Tests**: official Nuxt projects layout — `test/unit/` (node environment, pure logic) + `test/nuxt/` (Nuxt runtime, auto-included in Nuxt's TS context); never call real Supabase network or Electron IPC — per `.trae/rules/frontend/tests/`.

## Verification

- `pnpm --filter desktop test` (single file: `vitest run test/nuxt/<file>.test.ts`; single project: `--project nuxt` / `--project unit`)
- `pnpm --filter desktop verify:build` — Electron production build smoke test
- Repo suite: `pnpm test` → `typecheck` → `lint`
