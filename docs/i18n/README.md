# Bilingual documentation pairing

Growth OS human docs ship in English + Chinese: `xxx.md` (English, authoritative) with `xxx.zh.md` (Chinese mirror, equal authority). Each pair is tracked by an `<en>.i18n.yaml` record next to the English side.

## Contract

- **Pairs update together.** Editing one side without the other is an incomplete change — bring the mirror along in the same change and re-record.
- **Recorded by hash.** `scripts/verify-translation-pairing.cjs` stores the git blob hash of both sides at the last confirmed-consistent state. `verify:docs` fails when a side drifts from its record.
- **Re-record after a paired change:**
  ```bash
  pnpm verify:pairing --write <path>   # any side of the pair
  ```
- **Which docs are paired:** the explicit list in `scripts/doc-pairs.manifest.json`. A new bilingual doc joins the system by adding its pair there, then `pnpm verify:pairing --write`.
- **Scope / exclusions:** this system covers human-facing READMEs and `docs/` guides. Agent-facing files — root/`apps/`/`packages/`/`tooling/` `AGENTS.md` and `CLAUDE.md`, `.trae/rules/**`, `.agents/notes/**` — are English-only by design and are not paired.

## Terminology

Use [terminology.md](terminology.md) for consistent translations; keep product names, tool names, and canonical terms untranslated.
