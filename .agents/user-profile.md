# 用户画像（User Profile）

> 活文档：采集与计分规则见 [.trae/rules/agent/user-profile.md](../.trae/rules/agent/user-profile.md)（仅 ≥3 影响默认行为）。

owner: primary（仓库所有者，单人开发）
last_updated: 2026-09-28

## 1. 代码风格（Code style）

- 视觉资产要与现有 UI 光学对齐：新增图标/素材先对照现有素材的 viewBox 占比与风格。
  confidence: 4 ｜ evidence: 09-12 纠正 GitHub 图标风格与大小不统一，viewBox 加内边距解决 ｜ last_updated: 2026-09-12
- 视觉反 AI 味：忌渐变堆砌、主题色滥用、描边按钮堆叠；宜线性图标、幽灵按钮、字重分层。
  confidence: 4 ｜ evidence: 09-27 扩展弹窗被指"样式不够细腻，AI 风味太重" ｜ last_updated: 2026-09-27

## 2. 问题解决路径（Problem-solving path）

- 先评估再动手：升级/迁移/选型先给官方依据与对比，确认后执行。
  confidence: 3 ｜ evidence: 09-08 ESM/rspack 先报告后执行 ｜ last_updated: 2026-09-08
- 对"越界"敏感：只做确认范围内的改动，扩展先提案；领域设计由用户主导，对标基准须忠实复刻不得自创。约束解读边界见 [.trae/rules/agent/interpret-user-constraints.md](../../.trae/rules/agent/interpret-user-constraints.md)。
  confidence: 4 ｜ evidence: 09-07 LLM 选型越界批评；09-13 未商量新增模块被批评；09-27 对标结构两次纠正 ｜ last_updated: 2026-09-27
- 重建/设计先映射既有记录：动手前读 Notes 与归档 changes，产出概念映射。
  confidence: 3 ｜ evidence: 09-14 未读设计笔记即成稿被批评 ｜ last_updated: 2026-09-18
- 大任务自主推进：按计划继续，高风险决策点才请示；事实变化时更新计划。
  confidence: 3 ｜ evidence: 09-07 阶段三/四连续"继续"推进 ｜ last_updated: 2026-09-08
- 实施反对一次到位：渐进切刀（骨架→加厚→闭环），每刀一个风险源、独立验收；定稿后清理旧结论。
  confidence: 4 ｜ evidence: 09-26 "一次到位会出现很多bug"；09-27 弹窗先静态后后端 ｜ last_updated: 2026-09-27
- 资质/付费门槛高时倾向零成本绕行，原目标占位。
  confidence: 2 ｜ evidence: 09-09 微信资质门槛→GitHub、QQ 占位 ｜ last_updated: 2026-09-12
- 偏好统一机制而非双轨：并行机制合并为单一来源；新结构与既有惯例一致，域不搞特例。
  confidence: 3 ｜ evidence: 09-08 OpenSpec 跨平台、09-09 note 瘦指针、09-26 AI 夹层纠正 ｜ last_updated: 2026-09-26
- 数据面产品语义（内置归属、CRUD 完整性、重名拦截、删除跳变）不按最小工程默认落，proposal 显式列待确认项。
  confidence: 3 ｜ evidence: 09-27 proposal 定稿后多次纠正（小花颜 seed 入库、补删除、重名未拦、删除刷新感） ｜ last_updated: 2026-09-27

## 3. 技术栈选择（Tech stack choices）

- 依赖与结构决策先查官方文档/registry 实证（发布时间、peer 声明、changelog），再定升级/钉住/落位；钉住必须带理由注释。
  confidence: 5 ｜ evidence: 09-08 钉版注释/查 releases/minimumReleaseAge；09-13 Playwright/Nest 文档复查；09-14 技术时效性（user_rules 已明文编码） ｜ last_updated: 2026-09-14

## 4. 沟通模式（Communication patterns）

- 短指令推进："继续"/"下一个"即自主衔接计划，不反复确认；收尾 hook 无新材料时静默跳过，勿重复仪式。
  confidence: 4 ｜ evidence: 多次会话一致；09-28 连续触发后明示"放松一点" ｜ last_updated: 2026-09-28
- 决策偏好选项化：接受"选项+推荐+理由"；技术选型可整体委托。
  confidence: 4 ｜ evidence: 多次 AskUserQuestion；09-26 架构委托判断 ｜ last_updated: 2026-09-26
- 汇报格式：接受"改了什么/验证了什么/风险与后续"三段式，未验证内容需明说；直白人话，砍表格与码值堆砌。
  confidence: 4 ｜ evidence: 全局规则明文；09-26 纠正汇报啰嗦 ｜ last_updated: 2026-09-26

## 5. 工作流习惯（Workflow habits）

- 提交所有权：用户自己执行提交，agent 汇报即可、不主动 commit；重大提交需明确授权。
  confidence: 4 ｜ evidence: 09-08 多个提交由用户完成 ｜ last_updated: 2026-09-08
- 重视 harness 防腐：主动要求审查规则/文档腐烂；愿意为机器化检查投入。
  confidence: 4 ｜ evidence: 09-08 两次防腐与 harness 扩展指令 ｜ last_updated: 2026-09-08
- IDE 并行编辑：关键文件常开，写入可能被旧缓冲覆盖；汇报中提醒核对。
  confidence: 3 ｜ evidence: 09-08 pnpm-workspace.yaml、AGENTS.md 两次覆盖 ｜ last_updated: 2026-09-08
- 验证环境由用户预置：dev server 用户自启，agent 用 chrome-devtools 验证页面，不自行起已运行服务。
  confidence: 2 ｜ evidence: 09-28 显式交代（措辞任务域，待佐证） ｜ last_updated: 2026-09-28
