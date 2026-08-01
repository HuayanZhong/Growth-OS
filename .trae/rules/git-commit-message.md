---
alwaysApply: false
scene: git_message
description: Git 提交信息规则定义
---

# Git 提交信息规则

基于 Conventional Commits 规范，适配 monorepo 与中文工作流。

## 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **Header**（第一行）：type 必填，scope 可选，subject 必填
- **Body**（可选）：空一行后开始，解释"为什么改"
- **Footer**（可选）：空一行后开始，记录 BREAKING CHANGE / 关联 issue

Header 总长度不超过 72 字符。Body 每行不超过 72 字符。

## Type（必填）

| Type       | 使用场景                       |
| ---------- | ------------------------------ |
| `feat`     | 新功能                         |
| `fix`      | 修复 Bug                       |
| `build`    | 构建系统或外部依赖变更         |
| `chore`    | 杂项（配置、工具链、脚手架等） |
| `ci`       | CI/CD 配置或脚本变更           |
| `docs`     | 纯文档变更                     |
| `perf`     | 性能优化                       |
| `refactor` | 代码重构（非功能、非修复）     |
| `revert`   | 回滚某次提交                   |
| `style`    | 代码格式变更（非逻辑改动）     |
| `test`     | 添加或修改测试                 |

## Scope（可选）

Scope 取值为 monorepo 包目录名，由 `commitlint.config.js` 动态扫描以下目录生成，新增包自动纳入：

- `apps/*` — 应用（如 `desktop`、`server`）
- `packages/*` — 共享包（如 `desktop-core`、`shared`）
- `tooling/*` — 工程化配置（如 `lint`、`format`、`typescript`、`test`）

非目录型 scope（固定）：

| Scope   | 含义                     |
| ------- | ------------------------ |
| `turbo` | `turbo.json`             |
| `deps`  | 根依赖或统一版本升级     |
| `repo`  | 仓库级配置（根目录文件） |
| `docs`  | `docs/`                  |

如果改动涉及多个包且不宜拆分提交，可以不写 scope。

## Subject 规范

- 使用中文，简洁陈述做了什么
- 以动词开头（新增 / 修复 / 重构 / 移除 / 升级 / 迁移 等）
- 不加句号
- 不加空泛描述（如"修改了部分代码"）

## Body 规范（可选）

- 解释"为什么改"和"设计思路"，不重复 diff 内容
- 每行不超过 72 字符，超长换行
- 用空行分隔多个段落
- 列举关键改动点时用 `-` 起行

## Footer 规范（可选）

| 场景            | 格式                         |
| --------------- | ---------------------------- |
| 破坏性变更      | `BREAKING CHANGE: <说明>`    |
| 关联/关闭 issue | `Closes #123` / `Fixes #123` |
| 引用相关 issue  | `Refs #123`                  |
| 引用相关 PR     | `See PR #45`                 |

破坏性变更也可在 type 后加 `!` 标记：`feat(server)!: <subject>`，同时 Footer 必须有 `BREAKING CHANGE` 说明。

## Revert 格式

```
revert: <原 commit 的 subject>

This reverts commit <hash>.
```

`<hash>` 是被回滚 commit 的完整 SHA。Revert 的 type 固定为 `revert`，subject 直接复用原 commit 的 subject。

## 完整示例

单行提交：

```
feat(desktop): 新增用户登录页面
```

多行提交（含 body + footer）：

```
fix(desktop-core): 修复窗口创建时白屏问题

Electron loadFile 加载绝对路径资源时无法解析，改为相对路径。
- 设置 NUXT_APP_BASE_URL=./
- 调整 buildAssetsDir 为相对路径

Closes #42
```

破坏性变更：

```
refactor(server)!: 迁移环境变量校验从 class-validator 到 zod

BREAKING CHANGE: env.validation.ts 不再导出 class，改导出 zod schema。
调用方需从 `validate(config)` 改为 `parseEnv(schema, config)`。
```

## 规则

1. 一条提交只做一件事。如果改动涉及多个独立逻辑，拆分为多次提交。
2. Header 用祈使句（动词开头），不写"为什么要改"（放 Body 中），只写"改了什么"。
3. 破坏性变更必须在 type 后加 `!` 或在 Footer 写 `BREAKING CHANGE`。
4. 不提交未完成的 WIP 代码。
5. Revert 提交必须保留原 commit 的 SHA。
