# Agent Note: Bilingual documentation (lightweight)

Status: implemented

## Problem

Growth OS docs need Chinese/English pairs like the DeepSeek-Harness project: `xxx.md` (English, authoritative) plus `xxx.zh.md` (Chinese mirror), with a language-switch line at the top of each.

## Decision/Proposal

Adopt the lightweight form of the pattern now: every doc ships as `xxx.md` + `xxx.zh.md`, both carry the `English | [中文](README.zh.md)`-style switch line, and `docs/guide-zh.md` indexes the Chinese mirrors. Currently applied to `README`, `docs/architecture.md`, and `docs/server/database.md`.

## Alternatives considered

- **Full DeepSeek mechanism** (`.i18n.yaml` pairing records + `verify-translation-pairing` script + terminology table): deferred. It adds a verification loop that the current docs volume does not justify yet; the pairing concept is already captured by "Pairs update together" in [docs/AGENTS.md](../../docs/AGENTS.md).
- **Single-file bilingual blocks**: rejected — doubles line length and breaks the "one home per fact" link model.

## Consequences

- Root `AGENTS.md` line about `verify:docs` "mirror consistency" was corrected to the actual checks (thin-pointer sync, links, budgets); real mirror verification arrives with the full mechanism.
- The taxonomy in [docs/AGENTS.md](../../docs/AGENTS.md) gains a `docs/server/` detail-doc tier implicitly; new server docs must ship both languages in the same change.
