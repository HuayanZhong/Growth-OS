# Module graph

> **Generated** by [generate-module-graph.cjs](../scripts/generate-module-graph.cjs) — do not edit by hand.
> `pnpm verify:docs` fails when this file is stale; regenerate with `pnpm generate:graph` and commit.
> External (non-workspace) dependencies are not listed; the dependency rules that always hold live in [packages/README.md](../packages/README.md).

## apps

| Package | Workspace dependencies | Workspace devDependencies |
| --- | --- | --- |
| `apps/desktop` | `@growth-os/shared`, `@growth-os/types`, `@growth-os/ui` | — |
| `apps/server` | `@growth-os/shared`, `@growth-os/types` | — |

## packages

| Package | Workspace dependencies | Workspace devDependencies |
| --- | --- | --- |
| `packages/desktop-core` | `@growth-os/types` | — |
| `packages/shared` | — | `@growth-os/types` |
| `packages/types` | — | — |
| `packages/ui` | — | — |
