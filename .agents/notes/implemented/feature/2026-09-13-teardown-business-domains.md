# Teardown business domains

Removed the five scaffolded business domains (agents / skills / projects / files / sessions) with their full chains — server modules, DB tables and migrations, types contracts, session event vocabulary + projection + bus, desktop feature clients and chat UI, tests, and the event-catalog pipeline — because the user will redesign and rebuild these domains themselves (Route A: teardown first, rebuild domain by domain under user guidance).

Kept untouched: the `audit` module, table, and `GET /audit-logs` (its write-side callers vanished with the domain files; audit now stands alone until rebuilt domains opt back in), plus auth / health / throttle / global infra and the platform-level `adapters/*` contracts in `@growth-os/types`.

Key decisions made during implementation:

- DB fully re-baselined: all five migrations + snapshot deleted, all business tables (incl. `audit_logs`) dropped, one fresh initial migration recreated from the remaining audit entity. Pre-drop backup of `audit_logs` (0 rows) written to the OS temp dir.
- `LLMMessage` inlined into `adapters/llm.ts` (was an alias of the deleted session `Message`); `PluginContext.onEvent` removed (event vocabulary gone, plugin loader not yet implemented).
- Gate wiring for the deleted event-catalog removed from `verify-docs.cjs` / `hook-regen-catalogs.cjs` / `verify-gates.cjs` (fixture now targets the config-catalog mapping).
- New catch-all `NotFoundModule` (`@Controller('{*path}')`, registered last): under URI versioning + global prefix, unmatched routes fell through to Express's HTML 404, bypassing `AllExceptionsFilter` — required by the new `platform-surface` spec (404 must carry `ApiErrorEnvelope`).

Full decision records and task checklist: [openspec/changes/teardown-business-domains/](../../../openspec/changes/teardown-business-domains/proposal.md) (proposal / design D1–D8 / tasks). This change supersedes the domain-related behavior described in the 2026-09-07 session/turn/fork/audit notes and the 2026-09-06 LLM adapter note for as long as the domains are absent.
