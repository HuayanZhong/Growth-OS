# desktop — Agent Guide

App contract: Nuxt 4 frontend + Electron shell (UI layer).

- **Auth flows follow the rules.** Login/sign-up/sign-out/403 fallback per `.trae/rules/frontend/auth/` (flows, credentials, token); never touch tokens manually, persist sessions via secureStorage.
- **Styles via semantic tokens + `cn()`.** Follow `.trae/rules/frontend/styles/` (colors, themes, animation with GSAP, reuse at 3+ uses); extract components into `@growth-os/ui`.
- **Tests never hit real services.** Supabase network and Electron IPC are mocked/stubbed per `.trae/rules/frontend/tests/mock.md`; run test → typecheck → lint in order.
- **IPC contract comes from `@growth-os/types`.** Channel names live in `packages/types/src/utils/ipc-channels.ts`; changing a channel updates `@growth-os/desktop-core` in the same change.
