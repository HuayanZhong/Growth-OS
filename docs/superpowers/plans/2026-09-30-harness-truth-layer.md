# Harness 真相层统一实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 rules/agents/skills/MCP 收敛到 `.agents/` 真相层，hooks 收敛到 `.claude/settings.json`，`.trae/`、`.claude/` 视图由 `scripts/sync-harness.cjs` 单向物化，Claude Code 获得与 Trae 对等的生态。

**Architecture:** 单一真相源（`.agents/{rules,agents,skills}` + `.mcp.json`）→ 幂等同步脚本物化到各 harness 视图目录（复制 + prune + 防 symlink 穿透）；规则 frontmatter 用 superset（`alwaysApply`+`description`+`globs`+`paths`）让 Trae 与 Claude Code 各自按需加载；守卫钩子改为"护真相、拦视图"。

**Tech Stack:** Node.js（CJS 脚本，与 `scripts/` 现有风格一致）、git、pnpm scripts。

**设计文档:** `docs/superpowers/specs/2026-09-30-harness-truth-layer-design.md`

## Global Constraints

- 本仓库 `core.symlinks=false`：**禁止新增 symlink 依赖**，一律实体文件 + 同步脚本
- 脚本风格：CJS（`require`）、`node:` 前缀导入、`#!/usr/bin/env node`，与 `scripts/hook-*.cjs` 一致
- 规则 frontmatter 必须保留 `alwaysApply` 与 `description`（`verify-gates.cjs` 与 `hook-guard-harness.cjs` 强制）
- 视图路径 `.trae/rules/**` 保持存在（约 50 处仓库引用 + `doc-budgets.manifest.json` 的 `harness` 键按此路径索引，不改键名）
- 每个任务以 `pnpm verify:gates && pnpm verify:docs && pnpm verify:invariants` 全绿收尾后才 commit
- commit message 中文、`type(scope): 描述` 格式，结尾 `Co-Authored-By: Claude Code <noreply@anthropic.com>`
- Node ≥ 24；Windows 环境（bash shell），路径比较统一 `/` 分隔

---

### Task 1: 技能收编 + 同步脚本（`sync-harness.cjs`）

**Files:**
- Move: `.trae/skills/{18 个 Trae 独有技能}` → `.agents/skills/`
- Delete: `.trae/skills/openspec-{apply,archive,explore,propose,sync,update}-*`（6 个，`.agents/skills` 已有规范版本）
- Create: `scripts/sync-harness.cjs`
- Modify: `package.json`（scripts 增加 `sync:harness`）

**Interfaces:**
- Produces: `node scripts/sync-harness.cjs [--check] [--strip-mcp-type]`；`--check` 漂移时列出到 stderr 并 exit 1（Task 6/7 依赖此退出码）；`pnpm sync:harness` 别名
- Produces: 脚本常量 `STRIP_DEFAULT = false`（Task 5 的 Trae 实测失败时改为 `true`）

本任务是原子的：`git mv` 完成但同步脚本未就绪时 `.trae/skills` 会缺技能，所以脚本与首跑必须在同一 commit。

- [ ] **Step 1: 摸清 18 个 Trae 独有技能与 `.agents/skills` 的名字冲突**

```bash
cd "c:/Users/Administrator/Desktop/Growth OS"
CANDIDATES="code-review electron-cdp-verify github-actions-templates multi-stage-dockerfile nestjs-best-practices nuxt pinia pnpm real-chain-e2e rule-decay-audit typescript-advanced-types ui-verify-devtools vite vitest vue-router-best-practices vue vueuse-functions webapp-testing"
for d in $CANDIDATES; do
  if [ -d ".agents/skills/$d" ]; then echo "冲突: $d"; else echo "可迁移: $d"; fi
done
```

预期：全部输出「可迁移」（`openspec-*` 6 个不在候选清单里，它们在 `.agents/skills` 已存在）。若有意外冲突：`diff -rq .trae/skills/$d .agents/skills/$d` 查看，保留 `.agents` 版（真相源优先），`.trae` 版直接 `git rm -r`。

- [ ] **Step 2: 迁移 18 个技能、删除 6 个 openspec 漂移副本**

```bash
CANDIDATES="code-review electron-cdp-verify github-actions-templates multi-stage-dockerfile nestjs-best-practices nuxt pinia pnpm real-chain-e2e rule-decay-audit typescript-advanced-types ui-verify-devtools vite vitest vue-router-best-practices vue vueuse-functions webapp-testing"
for d in $CANDIDATES; do git mv ".trae/skills/$d" ".agents/skills/$d"; done
for d in openspec-apply-change openspec-archive-change openspec-explore openspec-propose openspec-sync-specs openspec-update-change; do git rm -r --quiet ".trae/skills/$d"; done
```

注意：`.trae/skills` 里其余目录是指向 `.agents/skills` 的 symlink，不动。

- [ ] **Step 3: 创建同步脚本 `scripts/sync-harness.cjs`**

```javascript
#!/usr/bin/env node
/**
 * Materialize the platform-neutral truth layer (.agents/**, .mcp.json) into
 * per-harness view directories (.trae/**, .claude/**).
 *
 * Views are generated artifacts — never edit them by hand; edit the truth
 * source and re-run `pnpm sync:harness`. Copied 1:1; stale view files are
 * pruned; pre-existing symlinks in view positions are removed first (writing
 * through a symlink would corrupt the truth layer on core.symlinks=false hosts).
 *
 * Usage:
 *   node scripts/sync-harness.cjs                 # copy truth → views (prune stale)
 *   node scripts/sync-harness.cjs --check         # list drift to stderr, exit 1, write nothing
 *   node scripts/sync-harness.cjs --strip-mcp-type  # also strip "type" from .trae/mcp.json copy
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const CHECK = process.argv.includes('--check')
const STRIP_DEFAULT = false // flip to true if Trae rejects the typed .mcp.json schema
const STRIP_MCP_TYPE = process.argv.includes('--strip-mcp-type') || STRIP_DEFAULT
const VIEW_MARKER = '.sync-generated'

// [truthDir, viewDir] — every file under truth is copied to the same relative
// path under each view. FILE_VIEWS are single-file copies.
const DIR_VIEWS = [
  ['.agents/rules', '.trae/rules'],
  ['.agents/rules', '.claude/rules'],
  ['.agents/agents', '.trae/agents'],
  ['.agents/agents', '.claude/agents'],
  ['.agents/skills', '.trae/skills'],
  ['.agents/skills', '.claude/skills'],
]
const FILE_VIEWS = [['.mcp.json', '.trae/mcp.json']]

function relOf(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/')
}

function walkFiles(abs) {
  const out = []
  if (!fs.existsSync(abs)) return out
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = path.join(abs, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(child))
    else out.push(child)
  }
  return out
}

function stripMcpType(text) {
  const json = JSON.parse(text)
  for (const server of Object.values(json.mcpServers ?? {})) delete server.type
  return JSON.stringify(json, null, 2) + '\n'
}

function expectedViewContent(truthAbs, viewRel) {
  if (viewRel === '.trae/mcp.json' && STRIP_MCP_TYPE)
    return stripMcpType(fs.readFileSync(truthAbs, 'utf8'))
  return fs.readFileSync(truthAbs, 'utf8')
}

const drift = []

function collectJobs() {
  const jobs = [] // { truthAbs, viewAbs }
  for (const [truthDir, viewDir] of DIR_VIEWS) {
    const truthAbs = path.join(ROOT, truthDir)
    if (!fs.existsSync(truthAbs)) {
      drift.push(`truth layer incomplete: ${truthDir} missing`)
      continue
    }
    for (const file of walkFiles(truthAbs)) {
      jobs.push({ truthAbs: file, viewAbs: path.join(ROOT, viewDir, path.relative(truthAbs, file)) })
    }
  }
  for (const [truthRel, viewRel] of FILE_VIEWS) {
    const truthAbs = path.join(ROOT, truthRel)
    if (!fs.existsSync(truthAbs)) {
      drift.push(`truth layer incomplete: ${truthRel} missing`)
      continue
    }
    jobs.push({ truthAbs, viewAbs: path.join(ROOT, viewRel) })
  }
  return jobs
}

function collectStale(jobs) {
  const produced = new Set(jobs.map((j) => relOf(j.viewAbs)))
  const stale = []
  for (const [, viewDir] of DIR_VIEWS) {
    for (const abs of walkFiles(path.join(ROOT, viewDir))) {
      const rel = relOf(abs)
      if (path.basename(rel) === VIEW_MARKER) continue
      if (!produced.has(rel)) stale.push(abs)
    }
  }
  for (const [, viewRel] of FILE_VIEWS) {
    const abs = path.join(ROOT, viewRel)
    if (fs.existsSync(abs) && !produced.has(relOf(abs))) stale.push(abs)
  }
  return stale
}

function lstatSafe(p) {
  try {
    return fs.lstatSync(p)
  } catch {
    return null
  }
}

function removeExisting(viewAbs) {
  const st = lstatSafe(viewAbs)
  if (!st) return
  if (st.isSymbolicLink() || st.isFile()) fs.rmSync(viewAbs)
  else fs.rmSync(viewAbs, { recursive: true })
}

function main() {
  const jobs = collectJobs()
  const stale = collectStale(jobs)

  if (CHECK) {
    for (const job of jobs) {
      const st = lstatSafe(job.viewAbs)
      if (!st) {
        drift.push(`missing view: ${relOf(job.viewAbs)}`)
        continue
      }
      if (st.isSymbolicLink()) drift.push(`view is a symlink: ${relOf(job.viewAbs)}`)
      else if (fs.readFileSync(job.viewAbs, 'utf8') !== expectedViewContent(job.truthAbs, relOf(job.viewAbs)))
        drift.push(`drifted view: ${relOf(job.viewAbs)}`)
    }
    for (const abs of stale) drift.push(`stale view file: ${relOf(abs)}`)
    if (drift.length > 0) {
      for (const d of drift) process.stderr.write(`[sync-harness] ${d}\n`)
      process.stderr.write('[sync-harness] run `pnpm sync:harness` to materialize views\n')
      process.exit(1)
    }
    console.log('[sync-harness] views in sync')
    return
  }

  for (const abs of stale) removeExisting(abs)
  for (const job of jobs) {
    const st = lstatSafe(job.viewAbs)
    if (st?.isSymbolicLink()) fs.rmSync(job.viewAbs) // never write through a symlink
    fs.mkdirSync(path.dirname(job.viewAbs), { recursive: true })
    fs.copyFileSync(job.truthAbs, job.viewAbs)
  }
  for (const viewDir of [
    ...DIR_VIEWS.map(([, v]) => v),
    ...FILE_VIEWS.map(([, v]) => path.dirname(v)),
  ]) {
    const marker = path.join(ROOT, viewDir, VIEW_MARKER)
    if (!fs.existsSync(marker))
      fs.writeFileSync(
        marker,
        'generated by scripts/sync-harness.cjs — edit the .agents truth layer instead\n',
      )
  }
  console.log(`[sync-harness] synced ${jobs.length} files, pruned ${stale.length}`)
}

main()
```

- [ ] **Step 4: 注册 pnpm script**

`package.json` 的 `scripts` 中，`"verify:gates"` 行后加：

```json
"sync:harness": "node scripts/sync-harness.cjs",
```

- [ ] **Step 5: 首跑同步并验证幂等**

```bash
pnpm sync:harness
# 预期输出: [sync-harness] synced N files, pruned 0
pnpm sync:harness
# 预期输出: [sync-harness] synced N files, pruned 0（数字与上次一致 = 幂等）
node --check scripts/sync-harness.cjs && echo "syntax OK"
find .trae/skills -type l | wc -l   # 预期: 0（无残留 symlink）
ls .claude/skills | wc -l           # 预期: >= 68（44 迁移前 + 18 迁入 + 6 openspec）
```

- [ ] **Step 6: 验证门禁与 skill 名一致性**

```bash
pnpm verify:gates
# 预期: OK（平台漂移检查：openspec-* 技能 .trae 与 .agents 视图同源自拷贝，必然一致）
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "refactor(harness): 技能收编进 .agents 真相层并新增 sync-harness 同步脚本

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 规则迁移 `.trae/rules` → `.agents/rules`

**Files:**
- Move: `.trae/rules/**`（39 个 .md）→ `.agents/rules/**`
- View: `.trae/rules/**`、`.claude/rules/**`（由同步脚本重建）

**Interfaces:**
- Consumes: `pnpm sync:harness`（Task 1）
- Produces: `.agents/rules/` 39 个规则文件（frontmatter 尚未加 globs/paths，Task 3 处理）

- [ ] **Step 1: 迁移并立即重建视图（同一 commit 内完成，中途门禁不可运行）**

```bash
git mv .trae/rules .agents/rules
pnpm sync:harness
# 预期输出包含: synced N files（N 覆盖 39 规则 × 2 视图 + skills + agents 现有数）
```

- [ ] **Step 2: 验证引用路径全部恢复**

```bash
test -f .trae/rules/server/api/errors.md && echo "view OK"
ls .agents/rules/server/api/errors.md && echo "truth OK"
pnpm verify:gates && pnpm verify:docs
# 预期: 全部 OK（预算键 .trae/rules/... 仍在；verify-docs 的相对链接因 .trae 与 .agents 深度相同继续解析）
pnpm verify:invariants
```

若 `verify:docs` 报规则内相对链接失效：链接按 `.agents/rules/agent/x.md` 的深度修复（`.trae/rules/agent/x.md` 深度相同，一处修复两处生效）。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor(harness): 规则真相源迁入 .agents/rules，.trae/.claude 视图物化

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: 子代理迁移 `.trae/agents` → `.agents/agents` 并删除 `run_mcp`

**Files:**
- Move: `.trae/agents/*.md`（4 个）→ `.agents/agents/`
- Modify: 4 个文件的 frontmatter（删 `run_mcp`）
- View: `.trae/agents/`、`.claude/agents/`（同步重建）

**Interfaces:**
- Consumes: `pnpm sync:harness`
- Produces: `.agents/agents/{server-architect,frontend-auth-expert,frontend-style-expert,frontend-test-expert}.md`，frontmatter `tools: Read, Glob, Grep, Edit, Write, Skill, Bash`

- [ ] **Step 1: 迁移并修改 frontmatter**

```bash
mkdir -p .agents/agents
for f in server-architect frontend-auth-expert frontend-style-expert frontend-test-expert; do git mv ".trae/agents/$f.md" ".agents/agents/$f.md"; done
```

对 4 个文件逐一（以 sed 或手动 Edit）把 `tools: Read, Glob, Grep, Edit, Write, Skill, Bash, run_mcp` 改为：

```yaml
tools: Read, Glob, Grep, Edit, Write, Skill, Bash
```

（CC 对未知工具名会让 subagent 启动失败；`run_mcp` 在 Trae 官方工具表里也不存在，删除对两平台都正确。MCP 工具在 CC 子代理中经 `mcpServers` 字段或继承获得，无需占位名。）

- [ ] **Step 2: 重建视图并验证**

```bash
pnpm sync:harness
pnpm verify:gates
# 预期: OK（verify-gates 的 agent frontmatter 检查走 .trae/agents 视图，name/description/tools 均在）
grep -c run_mcp .agents/agents/*.md | grep -v ':0' ; echo "exit=$?"
# 预期: exit=1（grep 无匹配 → 无 run_mcp 残留）
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor(harness): 子代理真相源迁入 .agents/agents 并移除两平台皆非官方的 run_mcp

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 规则 frontmatter superset（globs + paths）与预算余量

**Files:**
- Modify: `.agents/rules/**`（39 个文件的 frontmatter）
- Modify: `scripts/doc-budgets.manifest.json`（`.trae/rules/...` 条目的 `maxWords` 余量）

**Interfaces:**
- Consumes: Task 2 的 `.agents/rules` 真相层
- Produces: 每个规则文件 frontmatter 形如 `alwaysApply` + `description` + `globs` + `paths`（`globs` 与 `paths` 值相同；`agent/**` 与 `git-commit-message.md` 不加）

**paths/globs 映射（逐目录）：**

| 规则目录/文件 | globs 与 paths 的值 |
|---|---|
| `server/api/*.md`（4 个）、`server/auth/*.md`（2）、`server/database/*.md`（2）、`server/middleware/*.md`（3）、`server/tests/*.md`（3） | `apps/server/**` |
| `frontend/auth/*.md`（3）、`frontend/styles/*.md`（9）、`frontend/tests/*.md`（8） | `apps/desktop/**, packages/ui/**` |
| `desktop/ipc-contract.md` | `apps/desktop/**` |
| `agent/*.md`（4）、`git-commit-message.md` | 不添加（CC 无条件加载，量小；Trae 维持 alwaysApply:false 智能生效） |

- [ ] **Step 1: 批量注入 frontmatter 字段**

用 Node 脚本一次性完成（放在仓库外临时执行或 heredoc，不入库）：

```bash
node -e "
const fs = require('fs'), path = require('path');
const MAP = [
  [/^server\//, 'apps/server/**'],
  [/^frontend\//, 'apps/desktop/**, packages/ui/**'],
  [/^desktop\//, 'apps/desktop/**'],
];
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())o.push(...walk(p));else if(e.name.endsWith('.md'))o.push(p)}return o}
for (const abs of walk('.agents/rules')) {
  const rel = path.relative('.agents/rules', abs).replace(/\\\\/g, '/');
  const hit = MAP.find(([re]) => re.test(rel));
  if (!hit) { console.log('skip (no paths):', rel); continue; }
  let text = fs.readFileSync(abs, 'utf8');
  if (/^paths:/m.test(text)) { console.log('already:', rel); continue; }
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { console.error('NO FRONTMATTER:', rel); process.exit(1); }
  const line = 'globs: ' + hit[1] + '\npaths: ' + hit[1] + '\n';
  text = text.replace(/^---\r?\n/, '---\n' + line);
  fs.writeFileSync(abs, text);
  console.log('updated:', rel, '→', hit[1]);
}
"
pnpm sync:harness
```

- [ ] **Step 2: 检查预算余量并上调 maxWords**

```bash
pnpm verify:gates
```

若输出 `harness word budget exceeded: .trae/rules/... (n > m)`，对每个超限条目把 `scripts/doc-budgets.manifest.json` 中该键的 `maxWords` 上调为 `ceil(n / 50) * 50`（每文件新增约 4–8 词）。直到 `verify:gates` 全绿。

- [ ] **Step 3: 抽查 superset 格式**

```bash
head -10 .agents/rules/server/api/errors.md
# 预期 frontmatter 依次含 alwaysApply、description、globs、paths
head -8 .agents/rules/agent/self-improvement.md
# 预期不含 globs/paths
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(harness): 规则 frontmatter 升级为 Trae(globs)+Claude Code(paths) superset

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: MCP 真相源 `.mcp.json` 与 `.trae/mcp.json` 视图

**Files:**
- Create: `.mcp.json`（项目根）
- Delete: `.trae/mcp.json`（旧实体文件，由同步重建）

**Interfaces:**
- Consumes: `pnpm sync:harness` 的 `FILE_VIEWS`（Task 1 已注册）与 `STRIP_DEFAULT` 常量

- [ ] **Step 1: 创建真相源 `.mcp.json`**

```json
{
  "mcpServers": {
    "docs-langchain": {
      "type": "http",
      "url": "https://docs.langchain.com/mcp"
    },
    "reference-langchain": {
      "type": "http",
      "url": "https://reference.langchain.com/mcp"
    },
    "gsap-master": {
      "command": "pnx",
      "args": ["-y", "@vinhnguyen/gsap-mcp"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=xhuhkaryzscetmvdxbzb&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
    }
  }
}
```

- [ ] **Step 2: 物化 Trae 视图**

```bash
rm .trae/mcp.json
pnpm sync:harness
cat .trae/mcp.json
# 预期: 与 .mcp.json 内容一致（含 type 字段，STRIP_DEFAULT=false）
node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8')); JSON.parse(require('fs').readFileSync('.trae/mcp.json','utf8')); console.log('both parse')"
```

- [ ] **Step 3: 人工实测 Trae（不能自动化，交给用户）**

请用户在 Trae 中打开项目，确认 MCP 面板出现 4 个服务器并可连接。若 Trae 拒绝含 `type` 的 schema：把 `scripts/sync-harness.cjs` 的 `STRIP_DEFAULT` 改为 `true`，重跑 `pnpm sync:harness`，再请用户复测。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(harness): MCP 配置收敛到项目根 .mcp.json，.trae/mcp.json 转为物化视图

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: hooks 收敛 — `.claude/settings.json` + 守卫改向 + 门禁改写

**Files:**
- Create: `.claude/settings.json`
- Delete: `.trae/hooks.json`
- Modify: `scripts/hook-guard-harness.cjs`（护真相 `.agents/**`、拦视图写入）
- Modify: `scripts/hook-regen-catalogs.cjs`（`.agents/**`、`.mcp.json` 变更触发同步）
- Modify: `scripts/verify-gates.cjs`（检查 2 改读 settings.json；检查 7 fixtures 改用 `.agents` 路径并新增"视图写入被拦"fixture）

**Interfaces:**
- Consumes: `node scripts/sync-harness.cjs`（PostToolUse 链触发）
- Produces: Trae 与 Claude Code 共用的 hooks 配置（Trae 官方兼容读取 `.claude/settings.json`）；守卫新行为：`.agents/{rules,agents,skills}` 写入按格式校验，`.trae/{rules,agents,skills}`、`.claude/{rules,agents,skills}` 直接 block

- [ ] **Step 1: 创建 `.claude/settings.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/hook-guard-harness.cjs",
            "timeout": 15
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/hook-regen-catalogs.cjs",
            "timeout": 30
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/hook-user-profile-reminder.cjs",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

（Trae 专有的 `loop_limit` 不写：Trae 侧默认 5，语义可接受。）

- [ ] **Step 2: 删除 `.trae/hooks.json`**

```bash
git rm .trae/hooks.json
```

（Trae 会合并读取 `.claude/settings.json` 的同一套钩子，保留旧文件将双重执行。）

- [ ] **Step 3: 改写守卫 `scripts/hook-guard-harness.cjs`**

三处修改。其一，`violationsFor` 的分支前缀：把 `norm.startsWith('.trae/rules/')` 改为 `norm.startsWith('.agents/rules/')`；`norm.startsWith('.trae/agents/')` 改为 `norm.startsWith('.agents/agents/')`；`/^\.trae\/skills\/[^/]+\/SKILL\.md$/.test(norm)` 改为 `/^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(norm)`。其二，`inScope` 整段替换为：

```javascript
const TRUTH_SCOPES = [
  (rel) => rel.startsWith('.agents/rules/'),
  (rel) => /^\.agents\/agents\/[^/]+\.md$/.test(rel),
  (rel) => /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(rel),
]
const VIEW_SCOPES = [
  (rel) => rel.startsWith('.trae/rules/') || rel.startsWith('.claude/rules/'),
  (rel) => /^\.trae\/agents\/[^/]+\.md$/.test(rel) || /^\.claude\/agents\/[^/]+\.md$/.test(rel),
  (rel) =>
    /^\.trae\/skills\/[^/]+\/SKILL\.md$/.test(rel) ||
    /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(rel),
]
if (VIEW_SCOPES.some((f) => f(rel))) {
  block(
    `${rel} is a generated view — edit the truth source under .agents/ instead, then run \`pnpm sync:harness\`.`,
  )
}
if (!TRUTH_SCOPES.some((f) => f(rel))) allow()
```

其三，文件头注释的 Scope 段同步改写为 `.agents/**`（truth）与 view-block 说明。

- [ ] **Step 4: 扩展 `scripts/hook-regen-catalogs.cjs` 的 MAPPINGS**

`MAPPINGS` 数组末尾追加：

```javascript
  {
    match: (rel) => rel.startsWith('.agents/') || rel === '.mcp.json',
    generate: 'node scripts/sync-harness.cjs',
    label: 'harness views',
  },
```

（同步脚本只写视图文件、不经 Write 工具，PostToolUse 不会递归触发自身。）

- [ ] **Step 5: 改写 `verify-gates.cjs` 检查 2**

将检查 2 整块（`// 2. hooks.json structure` 起，到 hook 条目循环结束）替换为：

```javascript
// 2. Hooks config: .claude/settings.json is the single truth (Trae natively
//    merges hooks from this file; .trae/hooks.json was retired to avoid
//    double execution).
const SETTINGS = '.claude/settings.json'
let hooksConfig = null
try {
  const settings = JSON.parse(read(SETTINGS))
  if (settings?.hooks && Object.keys(settings.hooks).length > 0) hooksConfig = settings
  else report(`${SETTINGS} registers no hooks`)
} catch (err) {
  report(`${SETTINGS} is not valid JSON: ${err.message}`)
}
if (hooksConfig) {
  const events = hooksConfig.hooks ?? {}
  const eventNames = Object.keys(events)
  if (eventNames.length === 0) report(`${SETTINGS} registers no hook events`)
  for (const eventName of eventNames) {
    const groups = events[eventName]
    if (!Array.isArray(groups) || groups.length === 0) {
      report(`${SETTINGS} event "${eventName}" has no hook groups`)
      continue
    }
    for (const [gi, group] of groups.entries()) {
      for (const [hi, hook] of (group.hooks ?? []).entries()) {
        const where = `${eventName}[${gi}].hooks[${hi}]`
        if (hook.type !== 'command')
          report(`${SETTINGS}: ${where} must be type "command", got ${JSON.stringify(hook.type)}`)
        else if (typeof hook.command !== 'string' || hook.command.trim() === '')
          report(`${SETTINGS}: ${where} has an empty command`)
      }
    }
  }
}
```

（原检查 2 中 hook 条目循环的其余报错行保持原语义，只把报错前缀从 `.trae/hooks.json` 换成 `${SETTINGS}`。）

- [ ] **Step 6: 更新 `verify-gates.cjs` 检查 7 的 fixtures**

守卫三 fixture 的 `file_path` 分别改为：`.agents/rules/desktop/ipc-contract.md`（block 与 valid 两例）、`apps/server/src/app.module.ts`（不变）。并在 guard fixtures 之后新增视图拦截 fixture：

```javascript
  // …block a direct write to a generated view…
  const guardView = runHook('hook-guard-harness.cjs', {
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    cwd: ROOT,
    tool_input: {
      file_path: '.trae/rules/desktop/ipc-contract.md',
      content: '---\nalwaysApply: false\ndescription: probe\n---\n\nbody\n',
    },
  })
  if (decisionOf(guardView) !== 'block')
    report('hook fixture failed: guard did not block a write to a generated view')
```

regen fixtures 之后新增同步触发 fixture：

```javascript
  // …a truth-layer write triggers the harness view sync…
  const syncHit = runHook('hook-regen-catalogs.cjs', {
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    cwd: ROOT,
    tool_input: { file_path: '.agents/rules/desktop/ipc-contract.md' },
  })
  if (syncHit.status !== 0 || !(syncHit.stderr || '').includes('regenerated harness views'))
    report('hook fixture failed: regen did not sync harness views for a truth-layer write')
```

- [ ] **Step 7: 先跑失败、再跑通过（TDD 顺序）**

```bash
pnpm verify:gates
```

在 Step 3–6 全部完成后运行一次即可：预期 OK。若在只完成部分修改时运行，预期 FAIL（如 `.trae/hooks.json is not valid JSON` 或 fixture 失败）——这验证改写确实生效。

- [ ] **Step 8: 验证三钩子行为不变**

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Write","cwd":".","tool_input":{"file_path":"apps/server/src/app.module.ts","content":"export {};"}}' | node scripts/hook-guard-harness.cjs; echo "exit=$?"
# 预期: 无输出, exit=0（应用写入放行）
echo '{"hook_event_name":"Stop"}' | node scripts/hook-user-profile-reminder.cjs
# 预期: block JSON，含 技能/Note/profile/decay-audit 四通道（随后 dedup）
```

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "refactor(harness): hooks 收敛到 .claude/settings.json，守卫改为护真相拦视图

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: 视图一致性门禁 + 文档 + 决策记录 + 全量验证

**Files:**
- Modify: `scripts/verify-gates.cjs`（新增检查 8：`sync-harness --check` 集成）
- Modify: `AGENTS.md`（目录表 + Rules 章节头部说明）
- Create: `.agents/notes/implemented/architecture/2026-09-30-harness-truth-layer.md`

**Interfaces:**
- Consumes: `sync-harness --check` exit 1 语义（Task 1）
- Produces: `pnpm verify` 全绿即代表"三平台视图与真相源零漂移"

- [ ] **Step 1: verify-gates.cjs 末尾（检查 7 块之后、`if (problems.length)` 输出之前）追加检查 8**

```javascript
// 8. View consistency: generated harness views must match the truth layer.
{
  const res = spawnSync(process.execPath, [path.join(HOOK_SCRIPTS, 'sync-harness.cjs'), '--check'], {
    encoding: 'utf8',
    cwd: ROOT,
  })
  if (res.status !== 0)
    report(
      `harness views drifted from the .agents truth layer:\n${(res.stderr || '')
        .split('\n')
        .filter((l) => l.startsWith('[sync-harness]'))
        .map((l) => '  ' + l)
        .join('\n')}`,
    )
}
```

（确认文件顶部已引入 `spawnSync`——检查 7 已在用，若无则 `const { spawnSync } = require('node:child_process')`。）

- [ ] **Step 2: AGENTS.md 目录表更新**

目录表中把 `.agents/` 一行改为：

```markdown
| `.agents/`              | **Truth layer** (`skills/`, `rules/`, `agents/`, decision notes `notes/`, `user-profile.md`) — edit here, views are generated |
```

`.trae/` 一行改为：

```markdown
| `.trae/`                | Trae harness — generated views (`rules/`, `agents/`, `skills/`) synced from `.agents/` + `documents/`, `commands/` |
```

并新增一行：

```markdown
| `.claude/`              | Claude Code harness — generated views (`rules/`, `agents/`, `skills/`) synced from `.agents/` + `settings.json` (hooks truth), `commands/opsx/` |
```

"Rules (.trae/rules)" 章节标题下加一句（不增加超过 ~20 词，防 AGENTS.md 1600 词预算超限；若超限按 Task 4 Step 2 同法上调）：

```markdown
Truth lives in `.agents/rules/**` (frontmatter carries both Trae `globs` and Claude Code `paths`); the paths below are generated views — run `pnpm sync:harness` after editing.
```

- [ ] **Step 3: 决策记录 `.agents/notes/implemented/architecture/2026-09-30-harness-truth-layer.md`**

```markdown
# Harness Truth Layer (.agents) — 2026-09-30

## Problem

Rules/agents/skills/MCP were duplicated across `.trae/`, `.claude/`, `.agents/` with diverging copies (observed: openspec skills drifted between `.claude/skills` and `.agents/skills`). Claude Code had no rules/agents/hooks/MCP ecosystem at all. Repository `core.symlinks=false`, so git dereferences symlinks into content copies — symlink-based sharing cannot be the source of truth.

## Decision

- `.agents/{rules,agents,skills}` + root `.mcp.json` are the single truth; `.trae/` and `.claude/` views are materialized by `scripts/sync-harness.cjs` (copy + prune + `--check` gate in `verify:gates`).
- Rule frontmatter is a superset: `alwaysApply`/`description`/`globs` (Trae) + `paths` (Claude Code lazy-load) — both platforms load on demand.
- Hooks truth is `.claude/settings.json` (Trae officially merges hooks from it); `.trae/hooks.json` retired to prevent double execution.
- Agent `tools` drop `run_mcp` (unofficial on both platforms; Claude Code fails subagent launch on unknown tool names).
- Guard hook validates writes to `.agents/**` truth and blocks writes to generated views.

## Consequences

- Editing truth without syncing is caught by `verify:gates` (red) and auto-healed by the PostToolUse hook.
- Trae's `type` tolerance in `.trae/mcp.json` is undocumented; fallback is `STRIP_DEFAULT = true` in `sync-harness.cjs`.
- ~50 repo references to `.trae/rules/**` remain valid — view paths still exist physically.
```

- [ ] **Step 4: 全量验证**

```bash
pnpm verify
# 预期: verify:invariants OK, verify:docs OK, verify:gates OK（含检查 8）
node scripts/sync-harness.cjs --check
# 预期: [sync-harness] views in sync
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(harness): 视图一致性门禁 + AGENTS.md 真相层说明 + 决策记录

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

- [ ] **Step 6: 人工验收清单（交给用户，逐项确认）**

1. Trae：打开项目 → 规则面板显示 39 条规则；agents 面板显示 4 个子代理；skills 面板显示全部技能（含 24 个迁入者）；MCP 4 个服务器可连（失败 → Task 5 的 STRIP_DEFAULT 回退）；hooks 在 Write/Edit 时触发一次
2. Claude Code：新会话读 `apps/server/**` 文件时 server 规则注入、读无关文件时不注入；`server-architect` 等 4 个 subagent 可调用；skills 列表 68 个；`/mcp` 显示 4 个服务器
3. OpenCode：规则照常经 `opencode.json` instructions glob 加载（视图路径未变）
4. 改一个 `.agents/rules/**` 文件保存 → PostToolUse 钩子自动重灌视图，`git status` 中视图文件同步更新

---

## Self-Review 记录

- **Spec 覆盖**：设计 §3 结构（T1–T5）、§4.1 frontmatter（T4）、§4.2 agents（T3）、§4.3 技能收编（T1）、§4.4 MCP（T5）、§4.5 hooks（T6）、§5 同步脚本与校验（T1/T6/T7）、§6 文档（T7）、§7 验证清单（各任务验证步 + T7 Step 6）——无缺口
- **占位符扫描**：无 TBD/TODO；预算上调与 STRIP 回退均给出确定性判定命令，非含糊描述
- **一致性**：`sync-harness --check` exit 1 语义（T1 定义，T7 消费）；`STRIP_DEFAULT`（T1 定义，T5 消费）；`.agents` 路径口径贯穿守卫/门禁/fixtures；视图路径键（`doc-budgets.manifest.json`）全程不变
- **已知偏差（相对设计 §5）**：视图目录标记文件采用 `.sync-generated`（无扩展名），而非 `.README.md`——避免进入 `verify-gates` 的 `.md` 遍历与预算检查
