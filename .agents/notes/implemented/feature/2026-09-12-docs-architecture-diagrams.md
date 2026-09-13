# Agent Note: Architecture diagrams in docs

Status: implemented

## Problem

`docs/architecture.md` carried only a 4-line ASCII data-flow sketch and `docs/module-graph.md` only tables — the architecture map had no rendered diagrams, and a hand-drawn dependency diagram would rot (violating "generator is authoritative").

## Decision

- `scripts/generate-module-graph.cjs` now also emits a **Mermaid dependency diagram** (`## Dependency diagram` in [module-graph.md](../../../docs/module-graph.md)): nodes = workspace packages, solid arrow = runtime dependency, dashed arrow = devDependency. Freshness stays enforced by `verify:docs` re-running the generator — the diagram cannot drift.
- The data-flow sketch in [architecture.md](../../../docs/architecture.md) (+ zh mirror, same change) is upgraded from ASCII to a Mermaid `flowchart TB`, and now includes the auth path (supabase-js → Supabase Auth) that previously appeared only in the Key mechanisms text.

## Alternatives considered

- `graphify` skill / external diagram MCPs: produce standalone HTML knowledge graphs, not doc-embedded diagrams; rejected as wrong output format for `docs/` and heavyweight for a 6-package workspace.
- Hand-drawn dependency diagram: rejected — duplicates what the generator already owns and would drift.
- ASCII only (no Mermaid): rejected — GitHub renders Mermaid natively and the IDE preview plugins are common; ASCII stays only where Mermaid cannot render (plain-text views see readable source).

## Consequences

- Dependency changes require `pnpm generate:graph` as before; the diagram updates with the tables in the same commit.
- Mermaid blocks count toward the [architecture.md](../../../docs/architecture.md) word budget (manifest ceiling unchanged; current count well under it).
- Bilingual pair `architecture.md` / `architecture.zh.md` hashes re-recorded via `pnpm verify:pairing --write`.
