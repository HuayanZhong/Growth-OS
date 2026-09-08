# Agent Note: OpenSpec 集成（规格驱动变更工作流）

Status: implemented

## Problem

非平凡变更的规格化流程（提案 → 规格 → 任务 → 实施 → 归档）此前散落在 iteration-plan 与各 design 文档，无统一流程；且该流程绑定 Trae 单平台——换 agent 平台（Claude Code/Cursor/Codex）后工作流不可迁移。

## Decision

- 集成 [OpenSpec](https://github.com/Fission-AI/OpenSpec)（Fission-AI，MIT，v1.12.0）：规格驱动开发框架，brownfield-first（delta 规格 ADDED/MODIFIED/REMOVED，只为正在改的部分写 spec，不为存量代码补写）。
- CLI 全局安装（`pnpm add -g @fission-ai/openspec`）；项目初始化 `openspec init --tools trae`——官方一等支持 Trae（`.trae/skills/openspec-*/SKILL.md` + `.trae/commands/opsx-*.md`）。
- 工作流：`/opsx-propose`（提案 + delta 规格 + 任务清单）→ `/opsx-apply`（实施）→ `/opsx-archive`（归档并合并 delta 到主 specs）。规格库 `openspec/`（specs/changes/config.yaml）提交进 git。
- **跨平台共享**：`openspec/` 是纯 Markdown 规格库，任何平台读同一份；双目标配置 `openspec init --tools "trae,agents"`——Trae 走 `.trae/commands` + `.trae/skills`（`/opsx-*` 命令），共享目标 `.agents/skills/openspec-*`（`/openspec-*` 技能调用）供 Claude Code/Codex/Zed 等读 `.agents/skills` 的平台使用（本仓 `.agents/skills` 已是跨平台共享技能库，天然契合）。新平台接入：`openspec init --tools <id>`。
- **config.yaml 已填项目 context**（技术栈/monorepo/ESM/校验/信封/验证链/conventional commits）与 per-artifact rules（proposal 标注 harness 触碰与受影响层、tasks 带验证命令、design 引用 Agent Notes）——生成的提案自动尊重本仓约定。
- **遥测已关闭**（`openspec config set telemetry.enabled false`；CI 环境自动禁用）。
- **AGENTS.md 安全性已确认**：新版 OpenSpec 不创建/编辑 AGENTS.md（旧版 marker 块由 `openspec update` 剥离）。

## Alternatives considered

- GitHub Spec Kit：重（Python、刚性阶段门）；Kiro：IDE 锁定。OpenSpec 轻量、迭代自由、30+ 工具。
- 自建规格模板（继续用 .trae/documents/ 散文档）：无流程强制、无跨平台指令生成、无归档/合并机制。

## Consequences

- 非平凡变更的 standing order 入 AGENTS.md（Commands 行）+ guide-zh 新增"变更工作流"节；`openspec/` 进 layout 表。
- `.trae/skills/openspec-*` 6 个生成技能已通过 verify-gates 的 Agent Skills 规范检查；`openspec update` 重写这些目录（OpenSpec 管理区），我方资产不受影响。
- `.trae/commands/` 为新目录（openspec 生成的 opsx 命令）；Trae 中以 `/opsx-propose` 等触发。
- 首次实战：下一个非平凡变更走 `/opsx-propose` 验证工作流（首个 change 的 spec 从该变更开始积累，spec 目录初期接近空是预期行为）。
