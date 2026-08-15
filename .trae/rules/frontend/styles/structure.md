---
alwaysApply: false
description: Style organization rule (Vue 3 + Tailwind CSS v4 + daisyUI 5): group in-component classes semantically; inline style forbidden; layered directory structure for style files. Use when writing template classes or adding style files/assets.
---

# Style Organization & Directory Structure

## In-component styles: group semantically, no inline style

**When to use**: when writing a component template's classes.

**Key points**:

1. Class names group in "layout → size → color → state" order.
2. Prefer daisyUI's official component classes and standard utility classes; don't reinvent the wheel.
3. Inline `style` is forbidden (except special cases like dynamic sizes); dynamic styles switch semantic classes via `:class`.
4. When a single element's classes exceed 5–6 groups, trigger reusable extraction.

**Example**:

```vue
<!-- Wrong -->
<button class="btn btn-primary" style="width:100%; margin-top:8px">Login</button>
<!-- Correct -->
<button type="button" class="btn btn-primary btn-block mt-2">Login</button>
```

**Verification**:

```bash
rg -n 'style="' --glob '*.vue' apps packages
```

## Style directory structure: layered storage

**When to use**: when adding global styles, components, or static assets.

**Key points**:

1. Global styles (tailwind + daisyUI + themes) live only in the UI package's single CSS entry (`src/styles/main.css`); consumer entry CSS only `@import '<ui-package>/main.css'`, no re-declaration.
2. UI base components live under `src/components/ui/<name>/`, imported by consumers via the package name.
3. Page styles are inlined with the component; a small amount of page-specific global styles go under the app's `app/assets/css/`.
4. Static assets (icons etc.) go under `app/assets/icons/`, referenced via `~/assets/icons/...`, sized with `h-* w-*` overrides.

**Example**:

```text
ui-package/src/
├── styles/main.css        # single global style entry
├── lib/cn.ts              # class merging utility
└── components/ui/<name>/  # component + index.ts

app/app/assets/css/main.css  # only @import '<ui-package>/main.css'
```

**Verification**:

```bash
# Consumers should no longer have @plugin "daisyui" (no output means pass; rg exit code 1 on no match is normal)
rg -l '@plugin "daisyui"' apps
```
