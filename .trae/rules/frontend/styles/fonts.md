---
alwaysApply: false
description: Font rule (Tailwind CSS v4): bundle brand fonts locally; Chinese fonts split by unicode-range, load on demand; font-display: swap + fallback stack; 400-only fonts get [font-synthesis:none]. Use when adding/replacing fonts or fixing load failures.
---

# Font Spec (Local Bundling + On-demand Loading + Load Protection)

**When to use**: introducing brand/display fonts, replacing fonts, debugging font load failures.

**Key points**:

1. **Bundle locally, no CDN**: brand fonts are woff2 files under `src/assets/fonts/<font-name>/`; `@font-face` `src` references relative to the styles directory (`url('../assets/fonts/...')`); never keep `fonts.googleapis.com` / `fonts.gstatic.com` links — the desktop app must work offline. Leftover CDN links cause browser font errors and no offline fallback.
2. **Chinese fonts split by unicode-range, never merged into one file**: when fetching a Chinese display font from Google Fonts, keep the original slice structure (92+ woff2 slices + latin slices); the browser loads slices on demand per charset (measured: the page title requests only 3 slices); merging into one full file makes a single font dozens of MB, defeating on-demand loading.
3. **Load-protection trio, all three required**:
   - `font-display: swap`: show the fallback font while loading, no render blocking.
   - `font-family` fallback stack: the target font in the semantic token followed by a fallback chain, e.g. `'Caveat', 'ZCOOL QingKe HuangYou', ui-sans-serif, system-ui, sans-serif`.
   - Local bundling: no CDN means no load-failure path.
4. **Only weight-400-only fonts get `[font-synthesis:none]`** (e.g. ZCOOL QingKe HuangYou): disables browser bold synthesis to avoid stroke stretching when no matching weight exists; variable fonts (e.g. Caveat 400-700) use `font-bold` normally.
5. **Semantic tokens are exposed via `@theme`**: declare `--font-brand` in the UI package `src/styles/main.css` to generate the `font-brand` utility; business code references only the utility, never concrete font names (color token rules: [colors.md](colors.md)).
6. **Font files in per-font subdirectories**: `src/assets/fonts/<font-name>/<file>.woff2` (e.g. `fonts/caveat/`, `fonts/zcool/`); never flatten multiple fonts into one directory.
7. **Verify after font file changes**: when moving/renaming font files, update all `@font-face` `src` paths and run a production build to confirm the fonts still land in the output.

**Example**:

```css
@font-face {
  font-family: "ZCOOL QingKe HuangYou";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../assets/fonts/zcool/zcool-5.woff2") format("woff2");
  unicode-range: /* Google Fonts original slices, keep as-is */;
}

@theme {
  --font-brand: "Caveat", "ZCOOL QingKe HuangYou", ui-sans-serif, system-ui, sans-serif;
}
```

```vue
<h1
  class="font-brand text-2xl tracking-tight text-base-content [font-synthesis:none]"
>Welcome back</h1>
```

**Verification**:

1. `rg -n 'fonts\.googleapis\.com|fonts\.gstatic\.com' packages/ui` — no matches (no leftover CDN links).
2. Production build succeeds; woff2 files under `_nuxt/` all carry hashes (including zcool-\* slices and latin).
3. Browser Network panel: no font errors; only the character slices actually used by the page load (not the whole font).
