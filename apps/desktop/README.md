# desktop — Nuxt frontend + Electron shell

English | [中文](README.zh.md)

The Growth OS desktop app: Nuxt 4 frontend bundled into an Electron shell. The Electron main process/preload live in `@growth-os/desktop-core`; this app provides the UI.

## Run

```bash
cd apps/desktop
pnpm dev              # Nuxt dev + Electron window (vite-plugin-electron)
nuxi nuxt dev         # Nuxt only, browser debugging
```

Production entry: `pnpm start:prod` at the repo root launches Electron against the built app.

## Layout

```
app/               # Nuxt source
├── components/    # cross-domain: auth (login/register), chat, sidebar, ToastContainer
├── composables/   # transport/auth/state singletons: useApi, useAuth, useSecureStorage, useSupabase, useToast
├── features/      # domain features: <domain>/api.ts (typed client from @growth-os/types) + <domain>/use-*.ts (domain composables)
├── layouts/       # default, dashboard
├── middleware/    # auth.global.ts
└── pages/         # route assembly only (auth, dashboard: agents/files/projects/skills)
modules/electron.ts    # vite-plugin-electron wiring
scripts/verify-build.cjs
test/              # nuxt/ (integration) + unit/
```

## Stack

Nuxt 4 · Vue 3 · Tailwind CSS v4 · daisyUI · Supabase (auth) · GSAP. Design system: `@growth-os/ui`; IPC contract: `@growth-os/types`; Electron main: `@growth-os/desktop-core`.

## Rules

- Auth flows: `.trae/rules/frontend/auth/` (credentials, flows, token)
- Styles: `.trae/rules/frontend/styles/` (colors, themes, animation, …)
- Tests: `.trae/rules/frontend/tests/` (mock, isolation, commands, …)
