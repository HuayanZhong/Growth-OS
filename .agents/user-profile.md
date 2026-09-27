# 用户画像（User Profile）

> 活文档：采集与计分规则见 [.trae/rules/agent/user-profile.md](../.trae/rules/agent/user-profile.md)（仅 ≥3 影响默认行为）。

owner: primary（仓库所有者，单人开发）
last_updated: 2026-09-27

## 1. 代码风格（Code style）

- 视觉资产要与现有 UI 光学对齐：新增图标/素材先对照现有素材的 viewBox 占比与风格。
  confidence: 4 ｜ evidence: 09-12 纠正 GitHub 图标风格与大小不统一，viewBox 加内边距解决 ｜ last_updated: 2026-09-12
- 视觉反 AI 味：忌渐变堆砌、主题色滥用、描边按钮堆叠；宜线性图标、幽灵按钮、字重分层。
  confidence: 4 ｜ evidence: 09-27 扩展弹窗被指"样式不够细腻，AI 风味太重" ｜ last_updated: 2026-09-27

## 2. 问题解决路径（Problem-solving path）

- 先评估再动手：升级/迁移/选型先给官方依据与对比，确认后执行。
  confidence: 3 ｜ evidence: 09-08 ESM/rspack 评估先报告后执行 ｜ last_updated: 2026-09-08
- 对"越界"敏感：只做确认范围内的改动，扩展先提案；领域设计由用户主导，对标基准（Coze/截图）须忠实复刻不得自创。约束解读边界见 [.trae/rules/agent/interpret-user-constraints.md](../../.trae/rules/agent/interpret-user-constraints.md)。
  confidence: 4 ｜ evidence: 09-07 turn 管线/LLM 选型越界批评；09-13 未商量新增模块被批评；09-27 AGENTS 树形、扩展弹窗两次对标结构纠正 ｜ last_updated: 2026-09-27
- 重建/设计先映射既有设计记录：动手前读全部相关 Notes 与归档 changes，产出概念映射，不另起炉灶。
  confidence: 3 ｜ evidence: 09-14 未读设计笔记即成稿被批评；补读后按映射表推进 ｜ last_updated: 2026-09-18
- 大任务自主推进：计划确立后按计划继续，除非高风险决策点；事实变化时更新计划。
  confidence: 3 ｜ evidence: 09-07~09-08 阶段三/四连续"继续"推进 ｜ last_updated: 2026-09-08
- 实施反对一次到位：大任务须渐进切刀（骨架→加厚→闭环），每刀一个风险源、独立验收；定稿后清理设计前旧结论。
  confidence: 4 ｜ evidence: 09-26 "一次到位会出现很多bug"；骨架先看效果零实现；09-27 弹窗先静态后后端 ｜ last_updated: 2026-09-27
- 资质/付费门槛高时倾向绕行：零成本替代，原目标占位。
  confidence: 2 ｜ evidence: 09-09 微信资质门槛→GitHub、QQ 占位 ｜ last_updated: 2026-09-12
- 偏好统一机制而非双轨：倾向把并行机制合并为单一来源；新结构与仓库既有惯例一致，域不搞特例。
  confidence: 3 ｜ evidence: 09-08 OpenSpec 跨平台、09-09 note 瘦指针、09-26 AI 夹层纠正 ｜ last_updated: 2026-09-26

## 3. 技术栈选择（Tech stack choices）

- 依赖与结构决策先查官方文档/registry 实证（发布时间、peer 声明、changelog），再定升级/钉住/落位；框架同理；钉住必须带理由注释。
  confidence: 5 ｜ evidence: 09-08 钉版注释/查 releases/minimumReleaseAge；09-13 Playwright/Nest 文档复查；09-14 技术时效性（user_rules 已明文编码） ｜ last_updated: 2026-09-14

## 4. 沟通模式（Communication patterns）

- 短指令推进：常用"继续"/"下一个"，据此自主衔接计划，不反复确认。
  confidence: 4 ｜ evidence: 多次会话一致 ｜ last_updated: 2026-09-08
- 决策偏好选项化：接受"选项+推荐+理由"，选择迅速；技术选型可整体委托 agent。
  confidence: 4 ｜ evidence: 09-08 多次 AskUserQuestion、09-26 架构方案委托判断 ｜ last_updated: 2026-09-26
- 汇报格式：接受"改了什么/验证了什么/风险与后续"三段式，未验证内容需明说；汇报用直白人话，砍表格与 SHA/码值堆砌。
  confidence: 4 ｜ evidence: 全局规则明文；09-26 纠正汇报啰嗦 ｜ last_updated: 2026-09-26

## 5. 工作流习惯（Workflow habits）

- 提交所有权：用户自己执行提交，agent 汇报即可、不主动 commit；重大提交需明确授权。
  confidence: 4 ｜ evidence: 09-08 多个提交由用户完成 ｜ last_updated: 2026-09-08
- 重视 harness 防腐：主动要求审查规则/文档腐烂、扩展 harness；愿意为机器化检查投入。
  confidence: 4 ｜ evidence: 09-08 两次防腐与 harness 扩展指令 ｜ last_updated: 2026-09-08
- IDE 并行编辑注意：用户 IDE 常开关键文件，agent 写入可能被旧缓冲区保存覆盖；写入后应在汇报中提醒核对。
  confidence: 3 ｜ evidence: 09-08 pnpm-workspace.yaml、AGENTS.md 两次覆盖 ｜ last_updated: 2026-09-08
