# Agent Note: Trustworthy coverage (accurate scope + enforced baselines)

Status: implemented

Test coverage became trustworthy and enforceable through the `trustworthy-coverage` OpenSpec change: the six tested packages now exclude non-executable sources (font/image/CSS assets, type declarations, pure-type files, re-export barrels, generated migrations/seeders) from coverage measurement — the `ui` report previously showed a vanity "100%" polluted by ~125 woff2 files and `types` mixed in type-only files — and each package declares `coverage.thresholds` (lines + branches) at the floor of its corrected measured value, so a regression fails `pnpm test:coverage`; CI now runs `test:coverage` instead of bare `test`. Baseline numbers, exclusion criteria, and rejected alternatives live in the change: [openspec/changes/archive/2026-09-09-trustworthy-coverage/](../../../../openspec/changes/archive/2026-09-09-trustworthy-coverage/).
