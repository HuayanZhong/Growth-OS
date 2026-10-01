---
alwaysApply: false
description: Style performance rule (Tailwind CSS v4): @source scans source dirs precisely; styles import once via the UI package entry; arbitrary-value classes are rare; check CSS output size after builds. Use when the build balloons or styles don't apply.
---

# Style Performance

**When to use**: when the build size balloons, when styles don't apply or everything gets generated.

**Key points**:

1. Tailwind content scanning uses `@source` pointed precisely at source directories (e.g. the UI package itself); add `@source` explicitly when adding new source directories.
2. Styles are imported exactly once through the UI package entry (directory conventions: [structure.md](structure.md)); consumers don't repeat `@import 'tailwindcss'`.
3. Arbitrary-value classes (`h-[17px]`, `text-[11px]`) are rare; when truly needed, prefer a standard class or semantic token instead.
4. Reuse semantic classes and component variants instead of restating the same visual.
5. After builds, check CSS output size and class generation (including gzip).

**Example**:

```css
@source "../";
```

**Verification**:

1. Build succeeds; the output contains only actually-used classes.
2. CSS output gzip size is recorded as a baseline; no obvious abnormal bloat.
3. Classes outside the `@source` directories do not appear in the output.
