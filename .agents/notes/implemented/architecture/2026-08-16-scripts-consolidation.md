# Agent Note: scripts consolidation (tools/ → scripts/)

Status: implemented

## Problem

Two top-level directories held scripts: `scripts/` (repo gate `verify-docs.cjs`, budgets) and `tools/certs/` (code-signing cert generator + test certs). Their roles overlapped ("scripts folder" twice), and `tools/` was a single subdirectory in disguise.

## Decision/Proposal

Merge `tools/certs/` into `scripts/certs/` and delete `tools/`. One home for repo scripts: `scripts/` = gate scripts + cert tooling.

## Alternatives considered

- **Keep both, rename for clarity** — rejected: two homes for the same concern is the problem, not the name.
- **Merge into `tools/`** — rejected: `scripts/` matches npm/`package.json` convention already used by `verify:docs`.

## Consequences

- All references updated in the same change: `.env.example` (`CSC_LINK`), `.gitignore` (cert ignore patterns), `electron-builder.yml` comment, `generate-test-cert.ps1` usage comment.
- Test certs remain git-ignored (`scripts/certs/*.{pfx,cer,pem}`); only the generator script is tracked.
