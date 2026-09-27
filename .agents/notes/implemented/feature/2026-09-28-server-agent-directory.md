# Agent Note: Agent 目录服务端化

Status: implemented

Change: [server-agent-directory](../../../openspec/changes/archive/2026-09-28-server-agent-directory/proposal.md)

agents 表落库（RLS + 小花颜 seed 行）与创建/列表/删除三端点，跨端契约进 `@growth-os/types/src/api/agents.ts`；前端目录切为服务端唯一数据源（localStorage 与 `BUILT_IN_AGENTS` 移除）。设计决策与「内置 seed 入库 + 补删除」对原「永不写盘」假设的推翻记录见归档 change 的 proposal/design。
