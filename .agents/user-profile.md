# 用户画像（User Profile）

> 活文档：由 agent 在交互中按 [.trae/rules/agent/user-profile.md](../.trae/rules/agent/user-profile.md) 的采集标准、置信度计分与更新机制维护。
> 规则要点：同模式 ≥2 次独立观察才入档；明文陈述立即入档；每条必须带 evidence 与 last_updated；绝不记录凭证/密钥/隐私/业务数据内容；已被全局规则或 `.trae/rules/**` 编码的偏好只引用不复制。
> 置信度：5=用户成文规则（引用）｜4=重复显式陈述/纠正｜3=≥2 次一致行为｜2=单次观察待验证｜1=弱信号。仅 ≥3 影响默认行为。

owner: primary（仓库所有者，单人开发）
last_updated: 2026-09-09

## 1. 代码风格（Code style）

- (无已确认条目——代码风格已由 oxlint/oxfmt 规则与 `.trae/rules/frontend/styles/**` 编码，此处只记录规则未覆盖的个人偏好)

## 2. 问题解决路径（Problem-solving path）

- 希望先评估再动手：面对升级/迁移/选型类任务，先给官方依据与对比结论，经确认后执行（例：Nest 12 迁移对照、ESM 切换评估、rspack 评估均先出评估报告）。
  confidence: 3 ｜ evidence: 2026-09-08 ESM 评估与 rspack 评估、2026-09-08 依赖核查均先报告后经确认执行 ｜ last_updated: 2026-09-08
- 对"越界"敏感：要求严格区分骨架与业务，批评过未经确认的业务化实现；后续应只做确认范围内的改动，扩展先提案。
  confidence: 4 ｜ evidence: 2026-09-07 用户对 turn 管线/LLM 选型越界的明确批评及后续多次"只固定骨架"的表述 ｜ last_updated: 2026-09-08
- 大任务自主推进：计划确立后按计划继续，除非出现需要决策的高风险点；事实变化时更新计划。
  confidence: 3 ｜ evidence: 2026-09-07 至 09-08 阶段三/四连续"继续"推进模式 ｜ last_updated: 2026-09-08
- 偏好统一机制而非双轨：倾向把并行机制合并为单一来源或共享流，而非各养一套。
  confidence: 3 ｜ evidence: 2026-09-08 "不只是trae能用，别的agent平台也能共享工作流"（OpenSpec 跨平台接入）、2026-09-09 "我希望能够结合起来"（note 与 OpenSpec 整合为瘦指针） ｜ last_updated: 2026-09-09

## 3. 技术栈选择（Tech stack choices）

- 依赖升级决策模式：先查官方文档/registry 实证（发布时间、peer 声明、changelog），再决定升级或钉住；钉住必须带理由注释。
  confidence: 4 ｜ evidence: 2026-09-08 mikro-orm 精确钉注释、nestjs-pino 升级先查 releases、pnpm 豁免清理先查 minimumReleaseAge 文档 ｜ last_updated: 2026-09-08

## 4. 沟通模式（Communication patterns）

- 短指令推进：常用"继续"/"下一个"/"开始"，期望据此自主衔接既定计划，不反复确认下一步。
  confidence: 4 ｜ evidence: 多次会话中一致使用并明确表达此期待 ｜ last_updated: 2026-09-08
- 决策偏好选项化：对开放决策接受"选项 + 推荐 + 理由"的形式，选择迅速（如"清理 + 升级 7.1.0"、"现在切 ESM"）。
  confidence: 3 ｜ evidence: 2026-09-08 多次 AskUserQuestion 决策 ｜ last_updated: 2026-09-08
- 汇报格式：接受"改了什么/验证了什么/风险与后续"三段式汇报，未验证内容需明说。
  confidence: 3 ｜ evidence: 全局规则明文要求 + 会话中未提出异议 ｜ last_updated: 2026-09-08

## 5. 工作流习惯（Workflow habits）

- 提交所有权：用户通常自己执行提交（"提交了"），agent 完成后汇报即可、不主动 commit；重大提交任务需明确授权。
  confidence: 4 ｜ evidence: 2026-09-08 多个提交由用户完成（ed13c19、161627a、3d07ee5） ｜ last_updated: 2026-09-08
- 重视 harness 防腐：主动要求审查规则/文档腐烂、扩展 harness、增加防护；愿意为机器化检查投入（verify-invariants、hooks）。
  confidence: 4 ｜ evidence: 2026-09-08 两次防腐与 harness 扩展指令 ｜ last_updated: 2026-09-08
- IDE 并行编辑注意：用户 IDE 常开关键文件，agent 写入后可能被旧缓冲区保存覆盖（已发生 pnpm-workspace.yaml、AGENTS.md 两次）；写入这些文件后应在汇报中提醒用户保存前核对。
  confidence: 3 ｜ evidence: 2026-09-08 两次覆盖事件 ｜ last_updated: 2026-09-08
