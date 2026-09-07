# Agent Note: 会话 fork 语义（阶段三 3.2）

Status: implemented

## Problem

`SessionEventLog.fork(boundaryEventId)` 契约只约定 boundary 是 turn/step 边界事件，未约定：复制范围含不含 boundary、事件行 id 如何处理（`session_events.id` 有全局 unique 约束）、新会话 id 由谁生成。语义不定，前端分叉视图与后续 turn 管线无法对接。

## Decision

- 复制范围是源会话 `seq ≤ boundary.seq` 的全部事件，**含 boundary**：turn_end 为界 → 完整回合历史，干净分叉；turn_start 为界 → 新会话以 turn_start 开头等待输入。规则单一，两种 boundary 语义一致。
- boundary 只接受 `turn_start / turn_end / step_start / step_end`；其余类型 400 BAD_REQUEST，事件不存在或不属于源会话 404 NOT_FOUND（复用 STATUS_CODE_MAP 标准 code，不发明新 code）。
- 复制行生成新 UUID 作为事件 id（原 id 全局 unique 必然冲突）；payload 内的 `callId` 等关联原样保留，tool_call/tool_result 配对不受影响。
- 新 sessionId 由服务端生成 UUID，单 EM fork、单 flush 落库（单事务，失败全回滚）。
- 事件日志是唯一事实源：fork 只校验 boundary 事件存在，不依赖尚未落地的会话记录表（sessions CRUD 仍为 501 骨架）。

## Alternatives considered

- 复制不含 boundary：turn_end 场景下边界事件留在源会话，新会话缺回合收尾标记，且与 turn_start 场景语义不一致，规则变成按类型特判。
- 保留原事件 id：`session_events_id_unique` 直接冲突；改复合主键（sessionId + id）会动摇全局事件流的追溯模型，收益不足。
- 前端 fork（拉事件、改 sessionId、批量回写）：双写一致性负担 + 事件窗口期可被并发 append 污染；复制必须发生在服务端单事务内。

## Consequences

- HTTP 契约新增 `POST /sessions/:id/fork`（`ForkSessionInput`/`ForkSessionResult`），前端 `sessionsApi.fork` 同步镜像。
- fork 产物补插 `SessionRecord`（`session_records` 表）：源有记录 → 继承 agentId、标题加「（分叉）」；源无记录（事件先于记录存在）→ agentId 从复制事件推导，title 用缺省。会话 CRUD 同步接存储（create 缺省标题「新会话」，remove 在事务内级联删事件——事件表无 FK，由 service 显式删）。
- fork 前的"回放/恢复"路径无新机制：`GET events`（重放源）+ `GET messages`（恢复投影）+ 前端 `useSessionReplay` 已覆盖。
- 真实库冒烟验证过完整链路（create → append → fork（有/无记录源）→ list/update → remove 级联 → 清理），冒烟脚本为一次性产物已删除。
