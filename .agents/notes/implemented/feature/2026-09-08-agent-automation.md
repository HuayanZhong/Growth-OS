# Agent Note: agent 工作流自动化（M1–M3 交付）

Status: implemented

## Problem

agent 工作流存在三类手动环节：① 写入事件/配置/包图源文件后，需等 pre-commit FAIL 才发现生成物 stale，再手动重跑 `generate:*`；② 收尾验证需手动串联 invariants/docs/gates 多条命令；③ 门禁与 hook 脚本自身损坏（语法/配置）会静默失效——防护裸奔无告警。

## Decision

计划文档：[.trae/documents/lightweight-automation-plan.md](../../../.trae/documents/lightweight-automation-plan.md)（范围经用户纠正对齐为 agent 工作流自动化）。

- **A1 生成物自动重生成**：`PostToolUse` hook（`scripts/hook-regen-catalogs.cjs`，matcher `Write|Edit`）按显式映射表匹配源文件（session-events/events → event-catalog；.env.example → config-catalog；package.json → module-graph），命中即重跑生成器；未匹配静默放行，生成失败 stderr 提示并放行（stale 由 verify:docs 兜底，agent 不被卡）。
- **A2 统一入口**：`pnpm verify` = invariants + docs + gates 串联，agent 收尾单命令。
- **A3 门禁自监控**：`scripts/verify-gates.cjs`——`node --check` 全部 scripts/*.cjs、hooks.json 结构校验（version/事件组/command 非空）、hook 脚本空 stdin 活体冒烟（验证防御式"坏输入放行"协议）、预算 manifest 校验。
- 接入：pre-commit（invariants → gates → docs）与 CI（invariants → gates 步骤）。

## Alternatives considered

- 生成失败时 block（PostToolUse decision）：官方 block 语义在 PostToolUse 未明确，且卡住 agent 违背"防御式放行"立场；stale 兜底交门禁。
- 映射改为"每次写入跑全部生成器"：三个生成器幂等但没必要——映射表精确、扩展点清晰（加一行）。

## Consequences

- 正负例验证：写 session-events.ts → event-catalog 无感更新 ✓；写无关文件静默 ✓；坏 hooks.json 被拦截 ✓（verify-gates 上线即抓到 hook-regen-catalogs 的 fs 重复声明与注释 `*/` 提前终止两个真实 bug——自监控的价值当场兑现）。
- hook/门禁脚本头注释禁用 `*/` 序列（glob 形如 `**/*.md` 会终止块注释）——两次踩坑后的写作约束。
- 新增自动化项成本：hooks.json 加事件组或映射表加一行。
