---
alwaysApply: false
description: Frontend style color rule (Tailwind CSS v4 + daisyUI 5): use semantic color tokens only, never hard-code color values; brand colors map onto semantic tokens. Use when coloring elements or introducing brand colors.
---

# Colors

**When to use**: when coloring any element, when introducing brand colors.

**Key points**:

1. Colors use only daisyUI semantic tokens (`base-*`, `primary`, `info`, `success`, `neutral`, etc.), which switch automatically with the theme.
2. Hex, RGB, arbitrary-value classes (`bg-[#...]`) and bare `text-white` etc. are forbidden.
3. Opacity changes use the token opacity suffix (`/60`), never a separate color.
4. Brand colors map onto semantic tokens (e.g. QQ → `info`, WeChat → `success`); no new color values.

**Example**:

```vue
<!-- Wrong -->
<div class="bg-[#...] text-white">
<!-- Correct -->
<div class="bg-base-200 text-base-content">
```

**Verification**:

```bash
rg -n '#[0-9a-fA-F]{3,8}\b|(bg|text)-\[#' --glob '*.vue' --glob '*.css' apps packages
```
