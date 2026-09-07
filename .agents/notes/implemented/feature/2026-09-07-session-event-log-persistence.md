# Agent Note: 会话事件日志持久化（阶段三 3.1）

Status: implemented

## Problem

会话事件是唯一事实源（迭代计划 2.3 定稿词汇表），但此前只有类型与投影，没有存储。事件持久化需要 append-only、可按会话/Agent/类型/时间窗查询，且迁移不能误伤 Supabase 托管的数据库对象。

## Decision

- 存储落在后端 PostgreSQL（MikroORM），不做前端 IndexedDB：事件的生产方（turn/LLM 管线）与审计（3.4）都在服务端，后端已有 MikroORM + migrations 工作流。
- 实体用 MikroORM v7 `defineEntity`（Entity Schema）而非类装饰器：v7 不再导出经典装饰器 API（`@Entity`/`@PrimaryKey` 等），defineEntity 是官方推荐形态。
- 回放顺序键用插入序 `seq`（serial 主键）而非 timestamp：epoch ms 同毫秒事件无法定序；`timestamp`（timestamptz(3)，与契约 epoch ms 无损互转）只做过滤列。事件 `id` 加 unique 约束，重复 append 在 DB 层失败。
- `schemaGenerator.ignoreTriggers / ignoreRoutines` 置 true：Supabase 侧管理的 `public.rls_auto_enable` 等对象归 Supabase 管，ORM 对其 create-only；否则 `migration:create` 每次都生成对 Supabase 管理对象的 drop（首版迁移实际出现过，已删除重生成并手工清理 down）。
- type 列用 text 不用 pg enum：词汇表漂移防护已在投影处（`deriveMessages` 抛 `ProjectionError`）兜底，DB 层不重复锁字面量，避免词汇表演进时的 enum 迁移成本。
- 写入走 `em.persist(em.create(SessionEventEntity, insert))`，插入数据用显式 `SessionEventInsert`（不含 seq）而非 `RequiredEntityData`：后者的属性联合掺入 `Raw | null`，无法安全回灌给读侧映射函数复用。`em.create` 默认不进入持久化上下文，缺 `persist` 时 flush 不产生 INSERT（单测 mock 掩盖过该问题，真实库冒烟发现后修复）。

## Alternatives considered

- 前端 IndexedDB 存事件：被否。会造成前后端双写与一致性负担，且服务端审计查询（3.4）拿不到数据。
- timestamp 作回放顺序键：同毫秒事件顺序不稳定，回放不可靠。
- type 列用 pg enum + CHECK：与投影处的漂移防护重复，只增加迁移成本。
- 类装饰器定义实体：v7 已移除该 API 面，写下去无法编译。

## Consequences

- `GET /sessions/:id/events` 返回持久化序列（seq 升序），`/messages` 端点从存储投影；投影失败以 5xx 暴露。会话 CRUD 仍为骨架（501），fork/回放恢复（3.2）与事件总线（3.3）按计划后续落地。
- 迁移 `Migration20260907124411_session_events` 已应用到开发库；`mikro-orm:migration:down` 只 drop `session_events`，不触碰 Supabase 管理对象。
