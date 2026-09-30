# Harness 真相层统一设计（.agents 平台层 + 三平台视图）

日期：2026-09-30
状态：已批准（用户确认结构方案 + git 策略 2：同步脚本物化）

## 1. 背景与目标

仓库现有三套 harness 配置：`.trae/`（最完整，含 rules/agents/skills/documents/hooks.json/mcp.json）、`.claude/`（仅 commands + 6 个 openspec skills）、`.opencode/`（仅 commands + `opencode.json` instructions glob）。

目标：将平台无关的资产（rules、agents、skills、MCP）收敛到 `.agents/` 真相层，Claude Code 获得与 Trae 对等的生态（rules/agents/skills/hooks/MCP；documents 按用户要求排除，commands 三平台已就位不动），且**单一真相源、不手工复制**——视图目录由同步脚本从真相源物化，杜绝已发生的漂移复发（实证：`.claude/skills/openspec-*` 与 `.agents/skills` 内容已分叉）。

## 2. 研究结论（三平台格式差异，2026-09-30 官方文档核实）

| 资产 | Trae | Claude Code | OpenCode |
|---|---|---|---|
| rules | frontmatter：`alwaysApply` + `description` + `globs`（官方）；未知字段行为无官方文档 | 只读 `paths`，其余字段静默忽略（官方原文："paths is the only field Claude Code reads from a rule; any other field is ignored without an error"） | 无 rules 目录；`opencode.json` instructions glob 加载（现状已工作） |
| agents | `name`/`description`/`model`/`tools`/`disallowedTools`/`mcpServers`；`run_mcp` 非官方工具名 | 同 name/description/tools 语义；**未知工具名导致 subagent 启动失败**；省略 `tools` 继承全部 | `mode`/`permission` map/文件名即名字——差异大，需转换，本次不做 |
| skills | 读 `.trae/skills/` + `.agents/skills/`（官方开关「启用 .agents 技能目录」，重名 `.trae` 优先） | 读 `.claude/skills/`，symlink/内容均支持 | 原生发现 `.opencode`、`.claude`、`.agents` 三处 skills |
| commands | name/description | 多 `allowed-tools` 等字段 | `name` 被忽略，文件名即命令名 |
| MCP | `.trae/mcp.json`：官方格式远程为 `url`（无 `type`）；社区证实容忍 `type` | 项目根 `.mcp.json`：远程**必须** `type: "http"`，否则按 stdio 解析 | `opencode.json` 的 `mcp` 键，形状完全不同 |
| hooks | 6 事件；**官方兼容读取 `.claude/settings.json` 的 hooks 并合并执行**；`loop_limit` 为 Trae 官方字段 | `.claude/settings.json`；事件/matcher/timeout(秒) 与 Trae 兼容 | TS 插件机制，形态不同 |

本地实证：`core.symlinks=false`（git 将 symlink 解引用为实体副本）；`.trae/skills/daisyui`（symlink）与源零漂移；`.claude/skills/openspec-*` 与 `.agents/skills` 因平台命令名引用不同而分叉；`.trae/rules` 路径被约 50 个文件引用（含门禁脚本 `verify-docs.cjs`、`verify-gates.cjs`、`hook-guard-harness.cjs`、`doc-budgets.manifest.json`）。

## 3. 目标目录结构

```
.agents/                          ← 平台无关真相层（唯一手工编辑处）
  skills/                         ← 现有 44 个 + 从 .trae/skills 迁入 24 个实体技能
  rules/                          ← 从 .trae/rules 迁入 39 个规则（frontmatter 升级为 superset）
  agents/                         ← 从 .trae/agents 迁入 4 个专家（删除 run_mcp）
  user-profile.md, notes/         ← 不动
.mcp.json                         ← 真相源（4 服务器，远程补 "type": "http"）
.claude/
  settings.json                   ← hooks 三件套（真相源；Trae 官方兼容读取）
  rules/  ← 同步物化 .agents/rules/*
  agents/ ← 同步物化 .agents/agents/*.md
  skills/ ← 同步物化 .agents/skills/<name>（含现有 6 个 openspec，替换实体副本）
  commands/opsx/                  ← 不动
.trae/
  rules/  ← 同步物化 .agents/rules/*（保住全仓库 50 处旧引用 + Trae 原生读取）
  agents/ ← 同步物化 .agents/agents/*.md
  skills/ ← 同步物化 .agents/skills/<name>（兜底，防用户未开启 .agents 开关）
  mcp.json ← 同步物化 .mcp.json
  hooks.json → 删除（Trae 会同时读 .claude/settings.json，保留将双重执行）
  documents/                      ← 不动（用户明确不需要对等）
.opencode/                        ← 不动（instructions glob 经 .trae/rules 视图继续生效）
```

同步是**单向物化**：真相源 → 视图，视图目录中的陈旧文件被清理（prune）。物理上没有 symlink，git 存实体文件，跨机器零环境依赖。

## 4. 内容适配

### 4.1 rules frontmatter superset（39 个文件）

```yaml
---
alwaysApply: false          # Trae 保持原语义
description: <原文保留>      # Trae 智能生效 + 人类文档
globs: apps/server/**/*.ts  # Trae 按需加载
paths: apps/server/**/*.ts  # Claude Code 按需加载（值与 globs 相同）
scene: git_message          # 仅 git-commit-message.md，保留
---
```

paths/globs 映射表：

| 规则组 | paths/globs |
|---|---|
| `server/**` | `apps/server/**` |
| `frontend/auth/**`、`frontend/styles/**`、`frontend/tests/**` | `apps/desktop/**`、`packages/ui/**` |
| `desktop/ipc-contract.md` | `apps/desktop/**` |
| `agent/**`（4 个元规则）、`git-commit-message.md` | 不加 paths/globs（CC 无条件加载，量小；Trae 维持 alwaysApply:false 智能生效） |

### 4.2 agents（4 个文件）

- 删除 `tools` 中的 `run_mcp`（两平台都不是官方工具名；CC 侧会导致启动失败）。保留其余工具列表（`Read, Glob, Grep, Edit, Write, Skill, Bash` 均为两平台官方交集）。
- 其余 frontmatter 与正文原样共享（正文中的 `.trae/rules/**` 引用路径继续有效——视图目录物理存在）。

### 4.3 skills 收编（24 个 Trae 实体迁入）

`code-review`、`electron-cdp-verify`、`github-actions-templates`、`multi-stage-dockerfile`、`nestjs-best-practices`、`nuxt`、`openspec-*`（6 个）、`pinia`、`pnpm`、`real-chain-e2e`、`rule-decay-audit`、`typescript-advanced-types`、`ui-verify-devtools`、`vite`、`vitest`、`vue-router-best-practices`、`vue`、`vueuse-functions`、`webapp-testing` 物理迁入 `.agents/skills/`；与现有 44 个重名的以 `.agents` 版为准。

openspec 6 个技能的平台命令名分叉：以 `.agents/skills` 版（引用 `/openspec-*` 技能名）为规范版本；`/opsx:*` 命令引用属于平台视图差异，不做进真相源。

### 4.4 MCP（`.mcp.json`，项目根）

```json
{
  "mcpServers": {
    "docs-langchain":       { "type": "http", "url": "https://docs.langchain.com/mcp" },
    "reference-langchain":  { "type": "http", "url": "https://reference.langchain.com/mcp" },
    "gsap-master":          { "command": "pnx", "args": ["-y", "@vinhnguyen/gsap-mcp"] },
    "supabase":             { "type": "http", "url": "https://mcp.supabase.com/mcp?project_ref=xhuhkaryzscetmvdxbzb&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching" }
  }
}
```

Trae 侧对 `type` 字段官方未定义、社区证实容忍——列为迁移实测项；若 Trae 拒绝，则 `.trae/mcp.json` 改为物化时剥离 `type` 字段的降级副本（同步脚本内处理）。

### 4.5 hooks（`.claude/settings.json`，新建）

```json
{
  "hooks": {
    "PreToolUse":  [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "node scripts/hook-guard-harness.cjs", "timeout": 15 }] }],
    "PostToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "node scripts/hook-regen-catalogs.cjs", "timeout": 30 }] }],
    "Stop":        [{ "hooks": [{ "type": "command", "command": "node scripts/hook-user-profile-reminder.cjs", "timeout": 15 }] }]
  }
}
```

- 与被删除的 `.trae/hooks.json` 内容等价；去掉 Trae 专有的 `loop_limit`（Trae 侧默认 5，语义可接受）。
- `.trae/hooks.json` 删除后 Trae 从 `.claude/settings.json` 合并读取同一套钩子，单次执行。
- 现有 `hook-regen-catalogs.cjs` 链路追加调用同步脚本（见 5）。

## 5. 同步脚本 `scripts/sync-harness.cjs`

- 输入：`.agents/{rules,agents,skills}` + `.mcp.json`；输出：第 3 节所列视图目录。
- 幂等：复制 + prune（删除视图中真相源已不存在的文件）；`.trae/mcp.json` 物化时可选剥离 `type`（降级开关）。
- 触发：① `package.json` 新增 `pnpm sync:harness`；② 追加进 PostToolUse 钩子链（`hook-regen-catalogs.cjs` 之后）；③ `verify-docs.cjs`/CI 增加“视图与真相源一致”的校验（不一致即红，防手工改动视图）。
- 视图目录中加 `.README.md`（或头部注释文件）声明“自动生成，勿手改，改 `.agents/`”。

## 6. 文档与引用更新

- `AGENTS.md`：目录表更新（`.agents/` 描述为真相层，`.trae/`/`.claude/` 标注视图性质）；"Rules (.trae/rules)" 章节路径保持不变（视图路径仍有效）。
- `.agents/notes/` 按 self-improvement 规则补一条决策记录（为什么同步物化而非 symlink）。
- 其余约 50 处 `.trae/rules` 引用**不改**——视图路径物理存在，语义不变。

## 7. 迁移验证清单（实施阶段逐项执行）

1. `pnpm sync:harness` 首跑：diff 视图结果符合预期，prune 不误删
2. Trae：`.trae/rules`、`.trae/agents`、`.trae/skills` 加载正常（无 symlink 了，实体副本，风险≈0）；`.claude/settings.json` hooks 在 Trae 中单次触发
3. Trae：`.trae/mcp.json`（含 `type`）加载 4 个服务器；失败则降级剥离重测
4. Claude Code：`.claude/rules` 懒加载验证（读 `apps/server/**` 文件时 server 规则注入；未匹配文件时不注入）；4 个 subagent 可正常启动；`.claude/skills` 44+ 技能被发现；`.mcp.json` 4 个服务器连接
5. OpenCode：`opencode.json` instructions glob 经 `.trae/rules` 视图继续加载
6. 门禁：`verify-docs.cjs`、`verify-gates.cjs`、`pnpm verify:invariants` 全绿；新增一致性校验生效
7. 回归：`hook-guard-harness.cjs`、`hook-regen-catalogs.cjs`、`hook-user-profile-reminder.cjs` 三脚本在新链路中行为不变

## 8. 风险与边界

- **Trae `type` 字段容忍度**：官方未定义 → 实测 + 同步脚本降级开关兜底
- **Trae `.agents` 开关是用户级设置**（不在仓库内）→ `.trae/skills` 视图物化兜底，开关与否都能加载
- **CC rules 39 个中 6 个无条件加载**（agent 元规则 + git-commit-message）→ 体量小，可接受；后续可用 paths 精细化
- **范围外**：OpenCode agents 转换（`.opencode/agents` 为空，暂无需求）；documents/ 不迁移；commands 三平台现状不动；`.claude/settings.local.json` 个人配置不进仓库
