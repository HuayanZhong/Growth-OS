# Agent Note: Trae harness 拓展与防腐机制

Status: implemented

## Problem

harness 资产与后端工作失衡：`.trae/agents/` 只有三个前端专家，后端（本次骨架工作的大头）没有 on-demand expert；`.trae/rules/server/api/` 缺请求校验规则（zod schema 共置 + 管道挂载的约定只散在 note 与分层契约里）；规则/文档的腐烂（本次审查修了 9 处：Jest 残留、API 语义反向、路径失配、版本过期）没有可重复的审查流程，新规则文件也可能漏登记成"孤岛"。

## Decision

- **新增 `.trae/rules/server/api/validation.md`**：入参校验规则——schema 共置 `@growth-os/types`、管道挂载、query `z.coerce`、VALIDATION_ERROR 信封、`invariant: skip` 豁免。
- **新增 `.trae/agents/server-architect.md`**：后端架构专家（格式对齐既有前端专家），核心约束覆盖 ESM、contextName、EM fork/persist、审计、测试隔离。
- **新增 `.trae/skills/rule-decay-audit/`**：把本次审查方法论固化为可重复工作流——枚举 harness 资产 → 提取可验证锚点（命令/API/路径/版本/示例保真）→ grep/跑命令对照 → 英文真相源修复 + 中文镜像同步 + 配对 hash 重录 → 索引完整性检查。原则：只审可机器验证的锚点；不为一次性观察加规则。
- **verify-docs 扩展第 7 项检查（harness 资产登记完整性）**：`.trae/rules/**/*.md` 与 `.trae/agents/*.md` 必须被根 AGENTS.md 引用，否则 FAIL（负例已验证：未登记文件被拦截）。防新资产成为对按需加载不可见的孤岛。
- 索引同步：根 AGENTS.md（Rules + Agents 节）、guide-zh.md（规则/专家/门禁三节，顺手修正 mock 描述的 Jest 残留）。

## Alternatives considered

- 规则-代码自动漂移检测（正则扫描规则里引用的 API 是否存在于代码）：误报高且覆盖不了语义漂移（如 STATUS_CODE_MAP 方向写反）；靠 rule-decay-audit skill 的人工+AI 审查更可靠。
- 把防腐工作流放 agents 而非 skills：专家是按任务触发的执行角色，防腐是可重复流程，SKILL.md 形态更贴合。

## Consequences

- 新增 harness 资产（rule/agent）若漏登记，pre-commit/CI 的 verify-docs 直接 FAIL；新增合法豁免沿用 `invariant: skip`。
- rule-decay-audit 为按需 skill：大迁移（测试框架/构建形态/依赖大版本）后或定期手动触发。
- 检查器的正负例验证方式（临时违规文件 → 命中 → 清理 → 恢复 OK）是新增检查项的标准验证姿势。
