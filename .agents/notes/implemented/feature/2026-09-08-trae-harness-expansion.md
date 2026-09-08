# Agent Note: Trae harness 拓展与防腐机制

Status: implemented

## Problem

harness 资产与后端工作失衡：`.trae/agents/` 只有三个前端专家，后端（本次骨架工作的大头）没有 on-demand expert；`.trae/rules/server/api/` 缺请求校验规则（zod schema 共置 + 管道挂载的约定只散在 note 与分层契约里）；规则/文档的腐烂（本次审查修了 9 处：Jest 残留、API 语义反向、路径失配、版本过期）没有可重复的审查流程，新规则文件也可能漏登记成"孤岛"。

## Decision

- **新增 `.trae/rules/server/api/validation.md`**：入参校验规则——schema 共置 `@growth-os/types`、管道挂载、query `z.coerce`、VALIDATION_ERROR 信封、`invariant: skip` 豁免。
- **新增 `.trae/agents/server-architect.md`**：后端架构专家（格式对齐既有前端专家），核心约束覆盖 ESM、contextName、EM fork/persist、审计、测试隔离。
- **新增 `.trae/skills/rule-decay-audit/`**：把本次审查方法论固化为可重复工作流——枚举 harness 资产 → 提取可验证锚点（命令/API/路径/版本/示例保真）→ grep/跑命令对照 → 英文真相源修复 + 中文镜像同步 + 配对 hash 重录 → 索引完整性检查。原则：只审可机器验证的锚点；不为一次性观察加规则。
- **verify-docs 扩展第 7 项检查（harness 资产登记完整性）**：`.trae/rules/**/*.md` 与 `.trae/agents/*.md` 必须被根 AGENTS.md 引用，否则 FAIL（负例已验证：未登记文件被拦截）。防新资产成为对按需加载不可见的孤岛。
- **新增 Trae 原生 Hook（`.trae/hooks.json`）**：官方 Hook 机制（docs.trae.cn，PreToolUse/PostToolUse/Stop 事件，stdin JSON 进、stdout JSON `{decision: "block", reason}` 出）。配置 `PreToolUse` + matcher `Write|Edit` 执行 `scripts/hook-guard-harness.cjs`：agent 写 harness 资产前校验官方资产格式——rules 文件必须声明 `alwaysApply`/`description`（智能生效），agents 文件 `name` 合法（字母开头、字母数字连字符、≤50）且 `description` 必填、`tools` 逗号分隔，SKILL.md 的 `name` 必须匹配父目录（Agent Skills 规范）。违规即 block 并把理由回喂给 agent。三个新资产的格式已对照官方文档确认合规，hook 防回归；Edit 事件不在前置校验内，由 pre-commit 门禁兜底。
- **新增 `Stop` hook 画像提醒（`scripts/hook-user-profile-reminder.cjs`）**：每轮结束 block 一次，把"按 user-profile 规则 §6 审视本轮信号"作为新请求回喂 agent——用户画像的"每次沟通自动提炼"由此实现；6h 去重（tmpdir 状态文件）+ `loop_limit: 3` 双重防循环；防御式解析（坏 stdin 放行）。
- **新增 `.trae/rules/agent/hooks.md`**：hooks 事件生命周期（触发条件/stdin 字段/block 语义）、配置层级（全局合并、项目唯一）、编写规范（只做机器可判定检查、防御式解析、零依赖、可执行 block 理由、Stop 状态去重）与清单。
- 索引同步：根 AGENTS.md（Rules + Agents 节）、guide-zh.md（规则/专家/门禁三节，顺手修正 mock 描述的 Jest 残留）。

## Alternatives considered

- 规则-代码自动漂移检测（正则扫描规则里引用的 API 是否存在于代码）：误报高且覆盖不了语义漂移（如 STATUS_CODE_MAP 方向写反）；靠 rule-decay-audit skill 的人工+AI 审查更可靠。
- 把防腐工作流放 agents 而非 skills：专家是按任务触发的执行角色，防腐是可重复流程，SKILL.md 形态更贴合。

## Consequences

- 新增 harness 资产（rule/agent）若漏登记，pre-commit/CI 的 verify-docs 直接 FAIL；新增合法豁免沿用 `invariant: skip`。
- rule-decay-audit 为按需 skill：大迁移（测试框架/构建形态/依赖大版本）后或定期手动触发。
- 检查器的正负例验证方式（临时违规文件 → 命中 → 清理 → 恢复 OK）是新增检查项的标准验证姿势。
