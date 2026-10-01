---
alwaysApply: false
description: Theme switching rule (daisyUI 5): themes enabled explicitly in CSS; switch via theme-controller (global); pages never lock data-theme; default marked with --default. Use when implementing light/dark or multiple themes.
---

# Theme Switching

**When to use**: light/dark switching, multiple themes (light/dark, etc.).

**Key points**:

1. Themes are enabled explicitly in the UI package CSS via `@plugin "daisyui" { themes: ... }`; unenabled theme names are invalid.
2. The switching control uses `theme-controller` (a hidden checkbox/radio); the mechanism is global and the control's position is unrestricted.
3. The default theme is marked with `--default`; don't use `--prefersdark` (following the system makes switching "appear ineffective").
4. Page roots never hard-code `data-theme` (it overrides the global switch); keep exactly one theme entry per page (multiple `theme-controller`s create `:root:has()` rules that override each other).

**Example**:

```css
@plugin "daisyui" {
  themes: light --default, dark, cupcake;
}
```

```vue
<label class="swap swap-rotate">
  <input type="checkbox" class="theme-controller" value="dark" />
  <svg class="swap-off h-6 w-6 fill-current"><!-- sun --></svg>
  <svg class="swap-on h-6 w-6 fill-current"><!-- moon --></svg>
</label>
```

**Verification**:

```bash
# Run from the app directory; -g matches the CSS build output, avoiding PowerShell treating < > as redirection
rg -n 'theme-controller\[value=' -g '*.css' .output
# Browser check: default theme ↔ switched theme both work
```
