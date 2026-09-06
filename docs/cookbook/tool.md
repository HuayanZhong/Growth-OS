# Cookbook: add a developer tool

How to add a `scripts/` tool (a checker, a generator, a migration helper). Live examples: [verify-docs.cjs](../../scripts/verify-docs.cjs) (checker), [generate-config-catalog.cjs](../../scripts/generate-config-catalog.cjs) (generator), [verify-translation-pairing.cjs](../../scripts/verify-translation-pairing.cjs) (checker exposing functions to another script).

## 1. Location and module format

One file: `scripts/<name>.cjs`. The `.cjs` extension is required — the repo root is `"type": "module"` and these tools are CommonJS. Knip's root entry (`scripts/**/*.cjs` in [knip.json](../../knip.json)) covers new files automatically; subdirectories are only for assets the tool reads (e.g. `scripts/certs/`, `scripts/*.manifest.json`).

## 2. Checker vs generator

**Checker** (validates, exits non-zero on violation): collect violations with `fail(msg)` printing to stderr and setting `process.exitCode = 1` — never `throw`; the gate should report all findings, not die on the first:

```js
function fail(msg) {
  console.error(`[my-tool] ${msg}`)
  process.exitCode = 1
}
```

**Generator** (renders a doc from sources): export the render as a pure function, keep a CLI branch writing the file — the verify-docs freshness gate re-runs the function and compares bytes with the committed doc:

```js
module.exports = { generateThing }

if (require.main === module) {
  fs.writeFileSync(OUT, generateThing())
}
```

## 3. Parsing TypeScript sources

Use the root `typescript` devDependency (`require('typescript')`, TS 6 as of now). Two lessons already paid for — see `generate-config-catalog.cjs` for the working pattern:

- Leading comments live in trivia: `ts.getLeadingCommentRanges(text, node.getFullStart())`, never `getStart()`.
- Diagnostic `fileName`s are forward-slashed even on Windows — normalize before path comparisons or filters silently never match.

## 4. Wire it up

- Root `package.json` script, named by convention: `verify:*` for checks (candidates for `verify-docs`/CI), `generate:*` for generators whose output is committed.
- If the tool checks something every commit must satisfy, add it as a section in `scripts/verify-docs.cjs` (numbered check) instead of a new husky hook — pre-commit already runs that one gate.
- If it generates a doc, register `{ file, regen, generate }` in the `GENERATED_DOCS` list of `verify-docs.cjs` and commit the generated file.

## 5. Verification

```bash
node scripts/<name>.cjs          # run it on the real repo; inspect output/diff
pnpm verify:docs                 # if it joined the gate
pnpm lint                        # lint-staged formats scripts/*.cjs on commit (oxfmt + oxlint)
```

For a generator, also prove the gate: tamper with the generated file, run `pnpm verify:docs` (must fail), regenerate, run again (must pass).
