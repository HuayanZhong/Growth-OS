# @growth-os/ui — Agent Guide

Package contract: design-system components and styles (Tailwind CSS v4 + daisyUI 5).

- **Semantic tokens only.** Never hard-code color values; brand colors map onto semantic tokens ([colors.md](../../.trae/rules/frontend/styles/colors.md)).
- **Merge, don't override.** External overrides go through class passthrough + `cn()`; no `!important` ([conflict.md](../../.trae/rules/frontend/styles/conflict.md)).
- **Extract at 3+ uses.** Class combos repeated three or more times become a component in `src/components/ui/` with a `cn()` merge ([reuse.md](../../.trae/rules/frontend/styles/reuse.md)).
- **Fonts.** Brand fonts stay bundled locally; Chinese fonts split by unicode-range and load on demand ([fonts.md](../../.trae/rules/frontend/styles/fonts.md)).
- **Themes.** Switch via theme-controller (global); pages never lock `data-theme` ([themes.md](../../.trae/rules/frontend/styles/themes.md)).
- Full style rule list: `.trae/rules/frontend/styles/`.
