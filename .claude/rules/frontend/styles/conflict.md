---
alwaysApply: false
description: Style conflict rule (Vue 3 + Tailwind CSS v4 + daisyUI 5): external overrides go through class passthrough + cn() merging; no !important, no hard-coded page data-theme. Use when styles are overridden or break after theme switching.
---

# Style Conflict Prevention

**When to use**: when overriding a component's default styles from outside; when styles get overridden unexpectedly; when styles break after a theme switch.

**Key points**:

1. No `!important` in business code; external overrides of default classes merge through `cn()`, later classes win (mechanism: [reuse.md](reuse.md)).
2. Page roots never hard-code `data-theme`; theme switching always goes through the global `theme-controller` (see [themes.md](themes.md)).
3. Avoid selectors that depend on DOM structure; keep styles decoupled from structure.
4. After changing themes, check foreground/background contrast (readable under both light and dark).

**Example**:

```vue
<!-- Wrong -->
<div data-theme="dark">
  <button class="btn btn-primary bg-red-500!">Login</button>
</div>
<!-- Correct: override classes merge via cn, theme stays global -->
<Button class="w-full">Login</Button>
```

**Verification**:

```bash
# Business code should contain no !important or hard-coded data-theme
rg -n '!important|data-theme' --glob '*.vue' apps packages
```
