# 用户画像（User Profile）

> 活文档：采集与计分规则见 [.agents/rules/agent/user-profile.md](../.agents/rules/agent/user-profile.md)（仅 ≥3 影响默认行为）。

owner: primary（仓库所有者，单人开发）
last_updated: 2026-09-30

## 1. 代码风格（Code style）

- 视觉审美反 AI 味：图标对齐既有风格与 viewBox 占比；忌渐变堆砌、主题色滥用、描边堆叠，宜线性图标、幽灵按钮、字重分层。
  confidence: 4 ｜ evidence: 09-12 图标风格；09-27 弹窗"AI 风味太重" ｜ last_updated: 2026-09-27
- 代码注释只述当前状态与机制，不写路线图/阶段叙事（规划归 design/notes）。
  confidence: 4 ｜ evidence: 09-28 纠正注释带阶段标记 ｜ last_updated: 2026-09-28

## 2. 问题解决路径（Problem-solving path）

- 选型/迁移先给官方依据；格式实测闭环；迁移后逐文件核对。
  confidence: 4 ｜ evidence: 09-08 ESM；09-30/10-08 手动纠错 | last_updated: 2026-10-08
- 对"越界"敏感：只做确认范围，扩展/收缩先提案；对标忠实复刻。边界见 [interpret-user-constraints](../../.agents/rules/agent/interpret-user-constraints.md)。
  confidence: 4 ｜ evidence: 09-07 越界；09-13 未商量加模块；09-27 对标两次纠正；09-28 删用户选型被要求找回 ｜ last_updated: 2026-09-28
- 重建/设计先读 Notes 与归档 changes。
  confidence: 3 ｜ evidence: 09-14 未读设计笔记即成稿被批评 ｜ last_updated: 2026-09-18
- 大任务自主推进：按计划继续，高风险点才请示；事实变化即更新计划。
  confidence: 3 ｜ evidence: 09-07 阶段三四连续"继续" ｜ last_updated: 2026-09-08
- 实施反对一次到位：渐进切刀，每刀一风险源独立验收；每刀跑全套验证（verify+lint+typecheck+test+hygiene，三门禁不含后四者）。
  confidence: 4 ｜ evidence: 09-26/27 切刀纠正；09-28 最小化；10-08 质询未跑全套 | last_updated: 2026-10-08
- 资质/付费门槛高时倾向零成本绕行，原目标占位。
  confidence: 2 ｜ evidence: 09-09 微信资质→GitHub、QQ 占位 ｜ last_updated: 2026-09-12
- 偏好统一机制而非双轨：并行机制合并单一来源；新结构守既有惯例，域不搞特例。
  confidence: 3 ｜ evidence: 09-08 OpenSpec 跨平台；09-26 AI 夹层纠正 ｜ last_updated: 2026-09-26
- 交互边界对标行业惯例：生成中禁新发送、按钮⇄停止切换、Auto=业界式动态路由非固定默认。
  confidence: 3 ｜ evidence: 09-28 终止按钮样式；"别的ai怎么做的"；纠正 Auto 动态路由 ｜ last_updated: 2026-09-28
- 数据面语义不落最小默认，proposal 列待确认项。
  confidence: 3 ｜ evidence: 09-27 proposal 定稿后多次纠正 ｜ last_updated: 2026-09-27

## 3. 技术栈选择（Tech stack choices）

- 依赖/结构决策先查官方文档与 registry 实证再定；钉住带理由注释（user_rules 已编码）。
  confidence: 5 ｜ evidence: 09-08 钉版注释；09-13/14 复查；09-28 deepseek 弃包名 ｜ last_updated: 2026-09-28
- 模型供应商接入偏好官方专用适配器（DeepSeek 用 @langchain/deepseek），通用兼容层作退路。
  confidence: 3 ｜ evidence: 09-28 明示"别用openai，先接入deepseek" ｜ last_updated: 2026-09-28
- 模型能力不均质（如视觉）：切换/路由须编排层守卫（注册表标能力+降级），不靠默认直通。
  confidence: 2 ｜ evidence: 09-28 质疑"切换模型怎么办"抓出守卫缺口 ｜ last_updated: 2026-09-28

## 4. 沟通模式（Communication patterns）

- 短指令推进："继续"/"下一个"即自主衔接；收尾 hook 无新材料静默跳过。
  confidence: 4 ｜ evidence: 多次会话一致；09-28 明示"放松一点" ｜ last_updated: 2026-09-28
- 决策偏好选项化（选项+推荐+理由）；技术选型可整体委托。
  confidence: 4 ｜ evidence: 多次 AskUserQuestion；09-26 架构委托判断 ｜ last_updated: 2026-09-26
- 汇报三段式（改动/验证/风险），未验证需明说；直白人话；长文档给大白话摘要。
  confidence: 4 ｜ evidence: 全局规则明文；09-26 纠正啰嗦；09-28 "看不进去" ｜ last_updated: 2026-09-28

## 5. 工作流习惯（Workflow habits）

- 提交所有权：用户自己 commit；重大提交需明确授权。
  confidence: 4 ｜ evidence: 09-08 多个提交由用户完成 ｜ last_updated: 2026-09-08
- 重视 harness 防腐：主动审查规则/文档腐烂，愿投机器化检查。
  confidence: 4 ｜ evidence: 09-08 两次防腐与 harness 扩展指令 ｜ last_updated: 2026-09-08
- IDE 并行编辑：文件常开，写入可能被旧缓冲覆盖；汇报提醒核对。
  confidence: 3 ｜ evidence: 09-08 pnpm-workspace、AGENTS.md 两次覆盖 ｜ last_updated: 2026-09-08
- 验证环境由用户预置：不起已运行服务；agent 自起缺位服务跑 E2E 可接受。
  confidence: 2 ｜ evidence: 09-28 交代后自起双端跑 E2E 未被纠正 ｜ last_updated: 2026-09-28
