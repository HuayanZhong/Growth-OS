# 用户画像（User Profile）

> 活文档：采集与计分规则见 [.trae/rules/agent/user-profile.md](../.trae/rules/agent/user-profile.md)（仅 ≥3 影响默认行为）。

owner: primary（仓库所有者，单人开发）
last_updated: 2026-09-28

## 1. 代码风格（Code style）

- 视觉资产与现有 UI 光学对齐：新增图标先对照 viewBox 占比与风格。
  confidence: 4 ｜ evidence: 09-12 纠正 GitHub 图标风格不统一 ｜ last_updated: 2026-09-12
- 视觉反 AI 味：忌渐变堆砌、主题色滥用、描边按钮堆叠；宜线性图标、幽灵按钮、字重分层。
  confidence: 4 ｜ evidence: 09-27 扩展弹窗"AI 风味太重" ｜ last_updated: 2026-09-27
- 代码注释只描述当前状态与机制，不写路线图/阶段叙事（阶段规划归 design/notes）。
  confidence: 4 ｜ evidence: 09-28 纠正 event-mapper 等注释带阶段标记 ｜ last_updated: 2026-09-28

## 2. 问题解决路径（Problem-solving path）

- 先评估再动手：升级/迁移/选型先给官方依据与对比，确认后执行。
  confidence: 3 ｜ evidence: 09-08 ESM/rspack 先报告后执行 ｜ last_updated: 2026-09-08
- 对"越界"敏感：只做确认范围，扩展先提案；对标忠实复刻。边界见 [interpret-user-constraints](../../.trae/rules/agent/interpret-user-constraints.md)。
  confidence: 4 ｜ evidence: 09-07 越界批评；09-13 未商量新增模块；09-27 对标两次纠正 ｜ last_updated: 2026-09-27
- 重建/设计先映射既有记录：动手前读 Notes 与归档 changes。
  confidence: 3 ｜ evidence: 09-14 未读设计笔记即成稿被批评 ｜ last_updated: 2026-09-18
- 大任务自主推进：按计划继续，高风险决策点才请示；事实变化时更新计划。
  confidence: 3 ｜ evidence: 09-07 阶段三/四连续"继续" ｜ last_updated: 2026-09-08
- 实施反对一次到位：渐进切刀，每刀一风险源独立验收；新刀最小可跑、扩展点留位；定稿清理旧结论。
  confidence: 4 ｜ evidence: 09-26/09-27 渐进切刀两次纠正；09-28 最小化能跑起来 ｜ last_updated: 2026-09-28
- 资质/付费门槛高时倾向零成本绕行，原目标占位。
  confidence: 2 ｜ evidence: 09-09 微信资质→GitHub、QQ 占位 ｜ last_updated: 2026-09-12
- 偏好统一机制而非双轨：并行机制合并单一来源；新结构守既有惯例，域不搞特例。
  confidence: 3 ｜ evidence: 09-08 OpenSpec 跨平台；09-26 AI 夹层纠正 ｜ last_updated: 2026-09-26
- 交互边界对标行业惯例：生成中禁新发送、发送⇄停止按钮态切换。
  confidence: 2 ｜ evidence: 09-28 "跟别的设计一样，按钮变成终止那种样式" ｜ last_updated: 2026-09-28
- 数据面产品语义不按最小默认落，proposal 列待确认项。
  confidence: 3 ｜ evidence: 09-27 proposal 定稿后多次纠正 ｜ last_updated: 2026-09-27

## 3. 技术栈选择（Tech stack choices）

- 依赖/结构决策先查官方文档与 registry 实证再定；钉住带理由注释（user_rules 已编码）。
  confidence: 5 ｜ evidence: 09-08 钉版注释；09-13/09-14 复查；09-28 deepagents 弃包名实证 ｜ last_updated: 2026-09-28
- 模型供应商接入偏好官方专用适配器（DeepSeek 用 @langchain/deepseek），通用兼容层作退路。
  confidence: 3 ｜ evidence: 09-28 明示"别用openai，先接入deepseek" ｜ last_updated: 2026-09-28

## 4. 沟通模式（Communication patterns）

- 短指令推进："继续"/"下一个"即自主衔接；收尾 hook 无新材料静默跳过。
  confidence: 4 ｜ evidence: 多次会话一致；09-28 明示"放松一点" ｜ last_updated: 2026-09-28
- 决策偏好选项化：接受"选项+推荐+理由"；技术选型可整体委托。
  confidence: 4 ｜ evidence: 多次 AskUserQuestion；09-26 架构委托判断 ｜ last_updated: 2026-09-26
- 汇报格式：接受"改了什么/验证了什么/风险与后续"三段式，未验证需明说；直白人话砍表格堆砌；规划长文档不逐条读，给大白话摘要。
  confidence: 4 ｜ evidence: 全局规则明文；09-26 纠正啰嗦；09-28 "通俗一点，看不进去" ｜ last_updated: 2026-09-28

## 5. 工作流习惯（Workflow habits）

- 提交所有权：用户自己 commit，agent 不主动提交；重大提交需明确授权。
  confidence: 4 ｜ evidence: 09-08 多个提交由用户完成 ｜ last_updated: 2026-09-08
- 重视 harness 防腐：主动审查规则/文档腐烂，愿为机器化检查投入。
  confidence: 4 ｜ evidence: 09-08 两次防腐与 harness 扩展指令 ｜ last_updated: 2026-09-08
- IDE 并行编辑：关键文件常开，写入可能被旧缓冲覆盖；汇报中提醒核对。
  confidence: 3 ｜ evidence: 09-08 pnpm-workspace.yaml、AGENTS.md 两次覆盖 ｜ last_updated: 2026-09-08
- 验证环境由用户预置：dev server 用户自启，agent 用 chrome-devtools 验证，不自行起已运行服务。
  confidence: 2 ｜ evidence: 09-28 显式交代（待佐证） ｜ last_updated: 2026-09-28
