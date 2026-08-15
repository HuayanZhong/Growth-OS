---
alwaysApply: false
description: Responsive style rule (Tailwind CSS v4 + daisyUI 5): mobile-first, enhance progressively across breakpoints; use adaptive containers; daisyUI size classes never take breakpoint prefixes. Use when adapting layouts or handling touch targets.
---

# Responsive Styles

**When to use**: adapting layouts to different window sizes, using breakpoints.

**Key points**:

1. Base classes describe mobile; `sm:`/`md:`/`lg:` enhance progressively.
2. Page layout uses daisyUI adaptive containers (`hero`/`hero-content`, `card`); widths use `max-w-*` + `w-full`, never fixed pixels.
3. daisyUI size classes (`btn-lg`, `input-lg`, etc.) **must not** take breakpoint prefixes; when a size change is needed, use standard size classes or switch shapes per breakpoint.
4. Icons use Tailwind size classes (`h-4 w-4`), never fixed SVG width/height.
5. Interactive elements keep a minimum tappable area of 40px.

**Example**:

```vue
<!-- Wrong -->
<div class="w-96"><input class="input input-lg w-full" /></div>
<!-- Correct -->
<div class="hero min-h-screen">
  <div class="hero-content w-full max-w-sm flex-col">
    <input class="input w-full" />
  </div>
</div>
```

**Verification**:

```bash
# Size classes should have no breakpoint prefixes
rg -n '(btn|input|select)-(lg|sm|xs):(sm|md|lg|xl)' --glob '*.vue' apps packages
# Narrow and wide windows: no horizontal scrollbar
```
