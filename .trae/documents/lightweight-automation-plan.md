# Agent 自动化系统实施计划（Agent Workflow Automation Plan）

状态：已完成（M1–M4 于 2026-09-08 全部交付；范围经用户纠正对齐为 **agent 工作流自动化**——自动化 agent 维护 harness/文档/验证的手动环节，而非门禁基础设施自监控）。

## 1. 需求分析与范围界定

**目标**：自动化 agent 工作流中的手动环节，减少手动维护，为后续增强预留接口。

**已实现（本周期）**：用户画像自动提炼（Stop hook 6h 去重）、harness 资产格式守卫（PreToolUse）、依赖自动升级（Renovate + 冷却对齐）、文档/规则门禁（pre-commit + CI）。

**本计划补齐**（agent 工作流剩余手动环节）：

- A1 **生成物自动重生成**：agent 写入事件/配置/包图的源文件后，自动重跑对应 `generate:*`，消除"改源 → pre-commit FAIL → 手动重生成"的往返
- A2 **验证统一入口**：`pnpm verify` 单命令串联 invariants + docs（agent 收尾不再手动串两条）
- A3 **门禁自监控**：hook/门禁脚本语法与 `hooks.json` 结构自检（agent 自动化体系的可靠性兜底——guard 静默失效即防护裸奔）
- A5 **agent 自审与沉淀闭环**：任务收尾三问（技能沉淀/结论沉淀/画像更新/摩擦记录）经 Stop hook 自动提醒；技能沉淀标准与逐步优化循环入规则（`.trae/rules/agent/self-improvement.md`）

**范围外**：运行时指标采集、参数自适应、多 agent 通信协议、自动规则生成（无官方机制/无真实痛点）。

## 2. 技术选型与架构

- Trae 原生 `PostToolUse` 事件（官方支持，matcher `Write|Edit`）承载 A1；既有 `PreToolUse`/`Stop` 不动。
- 零依赖 `.cjs`（与 `verify-*.cjs`、既有 hook 同风格）；生成器复用既有 `scripts/generate-*.cjs`（幂等、deterministic、秒级）。
- 架构不变：在 hooks 执行层新增一个事件组与两个脚本；定义层/演进层不动。

**预留接口**：① `hooks.json` 加事件组即接入新自动化；② `verify-gates.cjs` 的检查以函数数组注册；③ 生成器映射表（源 → 命令）为显式数组，新生成器加一行。

## 3. 核心功能开发

- **T1（A1）`scripts/hook-regen-catalogs.cjs`**：`PostToolUse`（`Write|Edit`）按 file_path 匹配生成源 → 执行对应 `generate:*`：
  - `packages/shared/src/session-events.ts`、`packages/shared/src/events/**` → `generate:events`
  - `.env.example` → `generate:config`
  - `apps/*/package.json`、`packages/*/package.json` → `generate:graph`
  - 未匹配源 → 静默放行；生成器失败 → stderr 提示并放行（stale 由 verify:docs 门禁兜底，不卡 agent）
- **T2（A2）**：`package.json` 增 `"verify": "pnpm verify:invariants && pnpm verify:docs"`
- **T3（A3）`scripts/verify-gates.cjs`**：`node --check` 全部 `scripts/*.cjs`；`hooks.json` 结构校验（version/事件组/command 非空）；hook 脚本空输入活体冒烟（防御式协议验证）
- **T4 登记**：AGENTS.md Commands 行 + Agent Note 更新

## 4. 测试与验证

- **A1 正例**：模拟 PostToolUse 写 `session-events.ts` → `docs/event-catalog.md` 自动更新；写无关文件 → 无动作
- **A1 防御**：generate 失败（临时改名生成器）→ agent 不被卡、stderr 提示
- **A3 负例矩阵**：脚本语法错误 / `hooks.json` 非法 JSON / 删除脚本 → verify-gates 全部拦截
- **回归**：全仓 test → typecheck → lint + hygiene + verify:docs + verify:invariants + verify:gates 全绿

## 5. 部署与监控

部署面即既有通道：`.trae/hooks.json`（PostToolUse/Stop/PreToolUse）+ pre-commit + CI。监控 = CI 红灯（GitHub 通知）+ Renovate dashboard（依赖面）；不建自建监控。

## 6. 里程碑与交付物

| 里程碑 | 内容 | 完成判据 | 交付物 |
| --- | --- | --- | --- |
| M1 生成物自动重生成 | T1 + 正例/防御验证 | 写事件源后 catalog 无感更新 | `scripts/hook-regen-catalogs.cjs` + hooks.json |
| M2 统一入口 | T2 | `pnpm verify` 单命令跑通 | package.json |
| M3 门禁自监控 | T3 + 负例矩阵 | 三种损坏场景全部拦截 | `scripts/verify-gates.cjs` |
| M4 接入与登记 | T4 + 全量回归 | CI/pre-commit 含全部 hook 与 gates 且绿 | AGENTS.md / note |

## 7. 资源与排期

agent 执行；M1→M4 严格顺序，单会话可完成；按用户全局规则不承诺日历时间，排期权在用户。

## 8. 质量验收标准

1. A1 正例 + 防御例、A3 负例矩阵全部命中。
2. 全仓 test / typecheck / lint / hygiene / verify:docs / verify:invariants / verify:gates 全绿。
3. 零新依赖、零运行时行为变更。
4. 扩展新自动化项的改动力 ≤ 一个映射行/一个检查函数。
5. 文档同步：AGENTS.md、guide-zh（如涉及）、note。
