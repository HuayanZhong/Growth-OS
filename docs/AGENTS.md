# AGENTS.md — The documentation standard

This file defines how Growth OS documents are structured: the tier taxonomy, writing rules, and the slop checklist. `scripts/verify-docs.cjs` enforces word budgets and relative links; `CLAUDE.md` is a thin pointer to the root `AGENTS.md`.

## The tier taxonomy: one home per fact

Each fact has one home; elsewhere, link to it.

| Tier | Job | Does NOT belong there |
|---|---|---|
| Root `AGENTS.md` | Standing orders: rules an agent needs every session, one line each, linking its home | Stories, worked examples, restated detail |
| `docs/architecture.md` | Ordered map: layers, packages, data flow; read before changing `packages/` | Type definitions, per-package detail, decision rationale, implementation status |
| `.trae/rules/**` | Domain rules (auth / styles / tests / git), English, loaded on demand | Anything already in root `AGENTS.md` |
| `.agents/notes/` | Decision records: the why and what was given up | Migration plans, acceptance checklists |
| `docs/guide-zh.md` | Chinese navigation index for human readers; indexes, never restates | Rule text, any translation of the rules |
| `docs/architecture/typescript-config.md` | Chinese detail doc; kept in place, linked from the map | Live behavior that the map must carry |
| Package README | Per-package contract | JSDoc restatement, other packages' concerns |

Placement: rationale → Agent Notes; standing orders → root `AGENTS.md`; detail → the owning document, linked from the map.

## Writing rules

- **Document current state, not change history.** Avoid "previously / now / no longer", PRs, and commits in durable prose; name the live mechanism. Change stories go in commits, Agent Notes, or postmortems.
- **Every non-trivial change includes an Agent Note in the same change.** Only mechanical/local edits are exempt.
- **One physical line per paragraph.** Code blocks, tables, and lists keep their formatting.
- **Pairs update together.** A Chinese mirror (`.zh.md`) or index changes in the same change as its English source; `docs/guide-zh.md` re-records the index when structure moves.
- **Write directly.** Name actors, files, and facts; name the exact check, API, or behavior instead of metaphors.

## The slop checklist

Hunt these in any doc:

- The same rule stated in more than one home. Keep one home, link the rest.
- Narrated history: "previously / now / no longer / renamed / was moved", PRs, or commits in durable prose. State the current fact; link a note when needed.
- Implementation-status annotations ("implemented!", "future: …"). Status rots; manifests and code carry it.
- Hand-restated catalogs, JSDoc, or inventories when source or a generator is authoritative.
- Reasoning transcripts: step-by-step implementation narration, proof of obvious branches, rejected local alternatives. Keep the contract; delete the path used to derive it.
- Paragraph walls: one paragraph carrying several rules. Split or demote detail to its home.
- Emphasis inflation: bold or CAPS everywhere means nothing stands out.

## Cross-reference with machine-checkable links

Link repository references with relative Markdown paths, never bare filenames or note numbers. `scripts/verify-docs.cjs` rejects missing targets. Word budgets live in `scripts/doc-budgets.manifest.json`; ceilings are guardrails, not reduction targets — raise a ceiling only when the words need the space.
