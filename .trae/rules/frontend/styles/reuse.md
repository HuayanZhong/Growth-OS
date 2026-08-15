---
alwaysApply: false
description: Reusable style extraction (Vue 3 + shadcn style): class combos repeated 3+ times become UI package components; variants via cva; merging via cn() keeps external overrides. Use when extracting UI base components or defining variants.
---

# Reusable Style Extraction

**When to use**: when the same class combo appears 3+ times; when a component needs multiple shapes and must remain externally overridable.

**Key points**:

1. Extract into the UI package `src/components/ui/<name>/` (component + index.ts), exported through a barrel.
2. Class merging always goes through `cn()` (`twMerge(clsx(...))`); external `class` merges via `cn(base, props.class)` so it stays overridable.
3. Variants are defined with cva; the `xxxVariants` function and its type ship with the component.
4. Rely on Vue attribute fallthrough for class passthrough; handle `$attrs.class` when the class lands on a non-root node.

**Example**:

```ts
// index.ts
export const buttonVariants = cva('btn', {
  variants: {
    variant: { default: 'btn-primary', outline: 'btn-outline', ghost: 'btn-ghost' },
    size: { default: '', sm: 'btn-sm', lg: 'btn-lg' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
```

```vue
<!-- Button.vue -->
<button type="button" :class="cn(buttonVariants({ variant, size }), props.class)">
  <slot />
</button>
```

**Verification**:

1. External override classes work after `cn()` merging (passing `class="w-full"` overrides the default width class).
2. UI package typecheck passes.
3. Repeated identical class combos on pages have been replaced with component references.
