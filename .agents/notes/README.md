# Agent Notes

Agent Notes record the "why" that code and regular docs cannot carry: the decision, what was given up, and required verification. Non-trivial changes ship a note in the same change; only mechanical/local edits are exempt.

## Lifecycle (encoded by directory)

- `proposed/{architecture,feature}/` — a decision under consideration.
- `implemented/{architecture,feature}/` — a decision that has shipped; describes shipped reality in present tense.

Rejected or fully superseded notes are archived (moved out of these two trees) rather than edited into history.

## Format

Filename: `yyyy-mm-dd-topic-title.md`. Every note follows the same skeleton:

```md
# Agent Note: <title>

Status: proposed | implemented

## Problem
## Decision/Proposal
## Alternatives considered
## Consequences
```

**`Alternatives considered` is mandatory** — it is the core value of a note. Write what was rejected and why; "we picked X" without "we rejected Y because Z" is not a note.

## Maintenance

- **Keep implemented notes in sync with shipped reality.** When a path, symbol, default, or mechanism changes, rewrite the stale fact in the same change — do not append change history.
- **This is not a license to rewrite decisions.** Implementations update in place; a reversal of the decision itself requires a new note that cross-links the old one.
- Write current state in present tense; no "should", no migration plans, no acceptance checklists in `implemented/` notes.
