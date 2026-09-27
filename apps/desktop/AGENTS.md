# desktop — Agent Guide

App contract: Nuxt 4 frontend + Electron shell (UI layer).

- **Auth flows follow the rules.** Login/sign-up/sign-out/403 fallback per `.trae/rules/frontend/auth/` (flows, credentials, token); never touch tokens manually, persist sessions via secureStorage.
- **Styles via semantic tokens + `cn()`.** Follow `.trae/rules/frontend/styles/` (colors, themes, animation with GSAP, reuse at 3+ uses); extract components into `@growth-os/ui`.
- **SFC layering stays strict.** `app/types/` holds per-domain type-only files (explicit `import type`, no barrel); `app/utils/` holds catalog constants + pure functions; `app/composables/` holds state and business logic (reactive returns for template unwrapping); SFCs are view assembly + event wiring only (view tokens and copy may stay inline) — no business constants or state machines inside `<script setup>`; composables import utils/types via relative paths so unit tests (node env, no `~` alias) can load them.
- **Tests never hit real services.** Supabase network and Electron IPC are mocked/stubbed per `.trae/rules/frontend/tests/mock.md`; run test → typecheck → lint in order.
- **IPC contract comes from `@growth-os/types`.** Channel names live in `packages/types/src/utils/ipc-channels.ts`; changing a channel updates `@growth-os/desktop-core` in the same change.
