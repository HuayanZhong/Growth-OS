---
alwaysApply: false
scene: git_message
description: Git commit message rules
---

# Git Commit Message Rules

Based on the Conventional Commits spec, adapted for the monorepo and the Chinese workflow.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **Header** (first line): type required, scope optional, subject required
- **Body** (optional): starts after a blank line, explains "why"
- **Footer** (optional): starts after a blank line, records BREAKING CHANGE / related issues

Header total length ≤ 72 characters. Body lines ≤ 72 characters each.

## Type (required)

| Type       | Use case                                    |
| ---------- | ------------------------------------------- |
| `feat`     | New feature                                 |
| `fix`      | Bug fix                                     |
| `build`    | Build system or external dependency changes |
| `chore`    | Misc (config, toolchain, scaffolding, etc.) |
| `ci`       | CI/CD config or script changes              |
| `docs`     | Pure documentation changes                  |
| `perf`     | Performance optimization                    |
| `refactor` | Code refactor (non-feature, non-fix)        |
| `revert`   | Revert a commit                             |
| `style`    | Code formatting changes (no logic changes)  |
| `test`     | Add or modify tests                         |

## Scope (optional)

Scope is **recommended, not enforced**: commitlint does not block scopes outside the enum (`scope-enum` is off), only lowercase is required. Recommended values:

- `apps/*` — applications (e.g. `desktop`, `server`)
- `packages/*` — shared packages (e.g. `desktop-core`, `shared`)
- `tooling/*` — tooling config (e.g. `lint`, `format`, `typescript`, `test`)

Fixed non-directory scopes:

| Scope   | Meaning                                    |
| ------- | ------------------------------------------ |
| `turbo` | `turbo.json`                               |
| `deps`  | Root dependency or unified version bumps   |
| `repo`  | Repo-level config (root files, .trae/, AGENTS.md) |
| `docs`  | `docs/`                                    |

If a change spans multiple packages and is hard to split, scope may be omitted; other reasonable scopes are allowed (e.g. `frontend-style` for rules under `.trae/`); commitlint does not enforce an enum.

## Subject Rules

- Write in Chinese, a concise statement of what was done
- Start with a verb (新增 / 修复 / 重构 / 移除 / 升级 / 迁移 etc.)
- No trailing period
- No vague phrasing (e.g. "修改了部分代码")

## Body Rules (optional)

- Explain "why" and the design intent; do not repeat the diff
- Max 72 characters per line; wrap long lines
- Separate paragraphs with blank lines
- Start list items with `-` when enumerating key changes

## Footer Rules (optional)

| Scenario            | Format                         |
| ------------------- | ------------------------------ |
| Breaking change     | `BREAKING CHANGE: <note>`      |
| Link/close issue    | `Closes #123` / `Fixes #123`   |
| Reference issue     | `Refs #123`                    |
| Reference PR        | `See PR #45`                   |

Breaking changes can also be marked with `!` after the type: `feat(server)!: <subject>`, and the Footer must carry a `BREAKING CHANGE` note.

## Revert Format

```
revert: <subject of the original commit>

This reverts commit <hash>.
```

`<hash>` is the full SHA of the reverted commit. The revert type is always `revert`, and the subject reuses the original commit's subject.

## Full Examples

One-line commit:

```
feat(desktop): 新增用户登录页面
```

Multi-line commit (with body + footer):

```
fix(desktop-core): 修复窗口创建时白屏问题

Electron loadFile 加载绝对路径资源时无法解析，改为相对路径。
- 设置 NUXT_APP_BASE_URL=./
- 调整 buildAssetsDir 为相对路径

Closes #42
```

Breaking change:

```
refactor(server)!: 迁移环境变量校验从 class-validator 到 zod

BREAKING CHANGE: env.validation.ts 不再导出 class，改导出 zod schema。
调用方需从 `validate(config)` 改为 `parseEnv(schema, config)`。
```

## Rules

1. One commit does one thing. If a change spans multiple independent concerns, split into multiple commits.
2. Header uses the imperative mood (verb-first) and states only "what changed", not "why" (that goes in the Body).
3. Breaking changes must add `!` after the type or a `BREAKING CHANGE` in the Footer.
4. Never commit unfinished WIP code.
5. Revert commits must keep the original commit's SHA.
