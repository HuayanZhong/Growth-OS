# Agent Note: Harness hardening (budgets, drift check, hook fixtures)

Status: implemented

Harness self-verification closed its biggest gaps through the `harness-hardening` OpenSpec change: harness assets (rules, plans, user profile) gained enforced word budgets, generated OpenSpec assets gained cross-platform drift detection, hook scripts gained fixture-driven behavior tests (guard block/allow, regen trigger/passthrough, Stop four-channel reminder + dedup), the desktop layer gained its first domain rule (IPC contract), vendored skills got an explicit project-rules-win precedence, and the Stop-hook reminder wording now matches the closing review. Decisions D1–D8 and the rejected alternatives live in the archived change's design doc: [openspec/changes/archive/2026-09-09-harness-hardening/](../../../../openspec/changes/archive/2026-09-09-harness-hardening/).

Friction backlog for decay-audit: (1) block comments in gate/hook scripts must avoid `*/` sequences (glob examples terminate the comment — hit 4x across sessions; candidate for a machine check); (2) SearchReplace on a call site sharing its text with the function declaration needs unique surrounding context (corrupted verify-gates.cjs twice this session before repair).
