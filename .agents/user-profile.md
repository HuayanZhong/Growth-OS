# 用户画像（User Profile）

> 活文档：采集与计分规则见 [.trae/rules/agent/user-profile.md](../.trae/rules/agent/user-profile.md)（仅 ≥3 影响默认行为）。

owner: primary（仓库所有者，单人开发）
last_updated: 2026-09-26

## 1. 代码风格（Code style）

- 视觉资产要与现有 UI 光学对齐：新增图标/素材先对照现有素材的 viewBox 占比与风格。
  confidence: 4 ｜ evidence: 2026-09-12 纠正 GitHub 图标风格与大小不统一，viewBox 加内边距解决 ｜ last_updated: 2026-09-12

## 2. 问题解决路径（Problem-solving path）

- 先评估再动手：升级/迁移/选型类任务先给官方依据与对比结论，经确认后执行。
  confidence: 3 ｜ evidence: 2026-09-08 ESM/rspack 评估先报告后执行（Nest 12 迁移同理） ｜ last_updated: 2026-09-08
- 对"越界"敏感：只做确认范围内的改动，扩展先提案；领域设计由用户主导，AI 不得未经商量自行新增/定型。
  confidence: 4 ｜ evidence: 2026-09-07 turn 管线/LLM 选型越界批评；2026-09-13 未商量新增模块被批评，全拆逐域重建 ｜ last_updated: 2026-09-13
- 重建/设计类任务先映射既有设计记录：动手前读全部相关 Agent Notes 与归档 changes，产出显式新旧概念映射，不另起炉灶。
  confidence: 3 ｜ evidence: 2026-09-14 未读拆除前设计笔记即成稿被批评，补读后产出映射表获推进 ｜ last_updated: 2026-09-18
- 大任务自主推进：计划确立后按计划继续，除非高风险决策点；事实变化时更新计划。
  confidence: 3 ｜ evidence: 2026-09-07 至 09-08 阶段三/四连续"继续"推进 ｜ last_updated: 2026-09-08
- 实施反对一次到位：大任务须渐进切刀（骨架→加厚→闭环），每刀一个风险源、独立验收；设计定稿后回头清理设计前的旧结论，不默认沿用。
  confidence: 3 ｜ evidence: 2026-09-26 "一次到位会出现很多bug，先策划由骨架到深入"；"先删掉以前的决定重新思考，以前是没设计好时就出现了"；2026-09-13 teardown 全拆重建同偏好 ｜ last_updated: 2026-09-26
- 外部资质/付费门槛高时倾向绕行：切零成本替代方案，原目标保留占位。
  confidence: 2 ｜ evidence: 2026-09-09 微信资质门槛→GitHub、QQ 占位 ｜ last_updated: 2026-09-12
- 受阻不绕圈：修复路径明确时立即执行；绝不以标记/占位文件代替实际动作，token 浪费零容忍。
  confidence: 4 ｜ evidence: 2026-09-26 循环与 token 纠正 ｜ last_updated: 2026-09-26
- 偏好统一机制而非双轨：倾向把并行机制合并为单一来源或共享流。
  confidence: 3 ｜ evidence: 2026-09-08 OpenSpec 跨平台接入、2026-09-09 note 整合为瘦指针 ｜ last_updated: 2026-09-09

## 3. 技术栈选择（Tech stack choices）

- 依赖与结构决策先查官方文档/registry 实证（发布时间、peer 声明、changelog），再决定升级/钉住/落位；框架能力同理；钉住必须带理由注释。
  confidence: 5 ｜ evidence: 2026-09-08 mikro-orm 钉版注释、nestjs-pino 查 releases、pnpm 查 minimumReleaseAge；2026-09-13 Playwright/Nest 12 文档复查；2026-09-14 deepagents 探索要求技术时效性（user_rules 已明文编码） ｜ last_updated: 2026-09-14

## 4. 沟通模式（Communication patterns）

- 短指令推进：常用"继续"/"下一个"/"开始"，期望据此自主衔接既定计划，不反复确认。
  confidence: 4 ｜ evidence: 多次会话一致 ｜ last_updated: 2026-09-08
- 决策偏好选项化：对开放决策接受"选项+推荐+理由"，选择迅速；技术选型可整体委托 agent 判断。
  confidence: 4 ｜ evidence: 2026-09-08 多次 AskUserQuestion；2026-09-26 架构方案委托判断 ｜ last_updated: 2026-09-26
- 汇报格式：接受"改了什么/验证了什么/风险与后续"三段式，未验证内容需明说；汇报用直白人话，砍表格与 SHA/码值堆砌。
  confidence: 4 ｜ evidence: 全局规则明文；09-26 纠正汇报啰嗦 ｜ last_updated: 2026-09-26

## 5. 工作流习惯（Workflow habits）

- 提交所有权：用户自己执行提交，agent 完成后汇报即可、不主动 commit；重大提交需明确授权。
  confidence: 4 ｜ evidence: 2026-09-08 多个提交由用户完成 ｜ last_updated: 2026-09-08
- 重视 harness 防腐：主动要求审查规则/文档腐烂、扩展 harness；愿意为机器化检查投入。
  confidence: 4 ｜ evidence: 2026-09-08 两次防腐与 harness 扩展指令 ｜ last_updated: 2026-09-08
- IDE 并行编辑注意：用户 IDE 常开关键文件，agent 写入可能被旧缓冲区保存覆盖；写入后应在汇报中提醒核对。
  confidence: 3 ｜ evidence: 2026-09-08 pnpm-workspace.yaml、AGENTS.md 两次覆盖 ｜ last_updated: 2026-09-08
