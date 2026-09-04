# @growth-os/ui

English | [中文](README.zh.md)

Design-system components and styles on Tailwind CSS v4 + daisyUI 5, architected in the shadcn style (component directories, `cn()` helper, barrel exports).

## Exports

| Path                                 | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `.` (`src/index.ts`)                 | Component barrel                        |
| `./main.css` (`src/styles/main.css`) | Style entry: Tailwind + daisyUI + fonts |

## Layout

```
src/
├── components/ui/     # reusable components (theme-toggle, ...)
├── lib/cn.ts          # clsx + tailwind-merge merge helper
├── styles/
│   ├── main.css       # style entry
│   └── fonts.css      # local font faces (Caveat, ZCOOL)
└── assets/fonts/      # bundled fonts (latin + zcool unicode-range splits)
```

## Usage

```ts
import { ThemeToggle } from '@growth-os/ui'
import '@growth-os/ui/main.css'
```

## Rules

- Semantic color tokens only, no hard-coded values — see [colors.md](../../.trae/rules/frontend/styles/colors.md).
- External overrides merge via `cn()` — see [conflict.md](../../.trae/rules/frontend/styles/conflict.md).
- Class combos repeated 3+ times become components here — see [reuse.md](../../.trae/rules/frontend/styles/reuse.md).

## Tests

Mirrored layout: `test/` sits beside `src/` (`src/x/y.ts` → `test/x/y.test.ts`); run `pnpm test` / `pnpm test:coverage` here. Component tests mount on happy-dom via `@vue/test-utils`.

## Known limitations

- Only `theme-toggle` is shipped so far; further components are extracted when class combos hit 3+ uses ([reuse.md](../../.trae/rules/frontend/styles/reuse.md)).
