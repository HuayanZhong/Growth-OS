# Agent Note: Cookbook — LLM adapter path (2.5)

Status: implemented

## Problem

Iteration plan 2.5 required a cookbook covering "add a package / tool / LLM adapter" with numbered verification steps; the phase-2 checklist pins the LLM-adapter path as the acceptance item. No adapter implementation existed yet, so the how-to had to also settle the implementation home and DI pattern before phase 4 pluginizes them.

## Decision

- `docs/cookbook/llm-adapter.md` (+ `.zh.md`, registered in `doc-pairs.manifest.json`) walks contract → implementation → env keys → DI registration → consumption → mocked tests → full verification. Every step ends in a runnable check (`pnpm --filter server typecheck/test`, `pnpm generate:config` + `pnpm verify:docs`).
- Implementation home: `apps/server/src/infra/adapters/llm/`, one file per provider, with a `Symbol` DI token (`LLM_ADAPTER`) next to them — "adapter wiring = infrastructure", peer of `infra/database`; consumers `@Inject(LLM_ADAPTER)` and never import a concrete class. Phase 4's plugin interface migrates this directory wholesale.
- The sample uses native `fetch` (Node 24 global) so the cookbook adds no dependency; `signal` from `LLMChatParams` flows into `fetch` so the stop button works. Env keys are plain optional strings read via `ConfigService` — the adapter throws a clear error when `LLM_API_KEY` is unset instead of failing boot, because nothing consumes it yet.
- Tests stub `vi.stubGlobal('fetch', ...)` with `Response` objects, success and non-2xx only — per the server mock rule, never the real API.
- Scope: only the LLM-adapter path is written this change (the checklist's acceptance item); "add a package / tool" stay open items in the plan.
- While cross-checking sources, the architecture map's Env mechanism was found stale (still the pre-2.4 dotenv `-c` cascade and "inlined at build") — both pair sides now describe the `-e` chain, `launchEnv` launch-time override, and link the generated catalog.

## Alternatives considered

- `src/modules/llm/` or a top-level `src/adapters/`: rejected — adapters are capability wiring shared by future domains, not a product domain; `infra/` already hosts cross-module infrastructure (`database`).
- OpenAI SDK in the sample: rejected — the cookbook would then own a dependency decision for every reader; the raw-fetch core translates 1:1 to any SDK.
- Writing all three cookbook paths now: deferred — the package/tool paths have no pending consumer and would drift before first use; the checklist requires only the adapter path.

## Consequences

The next adapter (OpenAI gateway, another provider) is copy-adapt-step-1 + registration. The cookbook's snippet compiles under the repo's strict options; it is not machine-checked (docs ts-block gate covers `packages/*/README*.md` only), so correctness rides on the numbered verification commands — run them when following the guide.
