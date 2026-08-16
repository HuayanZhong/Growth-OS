# Agent Note: bilingual pairing mechanism

Status: implemented

## Problem

Growth OS ships bilingual docs (`xxx.md` EN + `xxx.zh.md` ZH) with no machine check. Consistency relied on review; a side edited alone silently drifted.

## Decision/Proposal

Adopt the DeepSeek-Harness pairing pattern, adapted to the repo's scale:

- Every bilingual pair is listed in `scripts/doc-pairs.manifest.json`.
- `scripts/verify-translation-pairing.cjs` stores the git blob hash of both sides in `<en>.i18n.yaml` next to the English file; `verify:docs` fails when a side drifts from its record.
- After a paired change, re-record: `pnpm verify:pairing --write <path>`.
- `docs/i18n/README.md` states the contract (which docs are paired, exclusions); `docs/i18n/terminology.md` fixes translation for product names and canonical terms.

## Alternatives considered

- **Generated module-graph / CI gating like DeepSeek-Harness** — rejected: overkill for a single-branch personal project; the hash check gives the same drift protection with one script.
- **Convention without a record file** — rejected: naming alone cannot detect drift.
- **git `hash-object` subprocess** — rejected in favor of an in-process sha1 blob hash (no subprocess, matches `git hash-object` byte-for-byte).

## Consequences

- Adding a bilingual doc means adding its pair to the manifest and running `--write`.
- Agent-facing docs (`AGENTS.md`, `.trae/rules/**`, `.agents/notes/**`, package `AGENTS.md`/`CLAUDE.md`) stay English-only and are excluded from pairing by contract.
- `verify:docs` now covers one more failure mode; the docs gate stays one command.
