# Agent Note: pnpm 12 migration

Status: implemented

## Problem

The repo pinned `pnpm@11.17.0`. Upgrade to pnpm 12 (pre-release `12.0.0-rc.8`, already cached locally via corepack) so installs and CI run the current major line.

## Decision/Proposal

- `packageManager` pinned to the exact `pnpm@12.0.0-rc.8` (corepack requires an exact version there).
- `devEngines.packageManager.version` set to the range `^12.0.0-rc.8` (pnpm 12 treats this field as a range; the resolved version is recorded in the lockfile).
- Lockfile stays at `lockfileVersion: '9.0'`; the stale pnpm 11 `packageManagerDependencies` block (self-reference to `pnpm@11.17.0`) is removed.
- CI needs no change: `pnpm/action-setup@v6` reads the version from the `packageManager` field.

## Alternatives considered

- **Keep the `packageManagerDependencies` entry as-is** — rejected: pnpm 12 tolerates it but never rewrites it (`pnpm install --lockfile-only --force` still reported the lockfile unchanged), so it would permanently record an obsolete pnpm 11 self-reference. Removing it yields a lockfile pnpm 12 accepts and would produce itself.
- **Force a full re-resolution to make pnpm 12 regenerate the section** — rejected after testing: pnpm 12 does not re-emit that section at all; it is pnpm 11-era bookkeeping for git-hosted dependency preparation and is inert for this repo.
- **Keep `devEngines.packageManager.version` exact (`12.0.0-rc.8`)** — rejected: pnpm 12 documents this field as range-valued, so a range matches the toolchain's own convention.

## Consequences

- Local and CI both resolve pnpm 12.0.0-rc.8 through corepack from the `packageManager` pin.
- Dependency tree is unchanged (install reports up to date); `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass under pnpm 12.
- pnpm 12 runs a supply-chain policy check on installs and writes `lockfile-verified.jsonl` into its cache directory; sandboxed/CI environments must allow writes there.
