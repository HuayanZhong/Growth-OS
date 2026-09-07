# Agent Note: 会话事件总线最小实现（阶段三 3.3）

Status: implemented

## Problem

会话事件需要进程内分发机制：turn/LLM 管线产生事件后，未来的消费者（审计 3.4、UI 推送、指标）需要统一的订阅入口。计划 2.3 的词汇表只有类型没有运行时分发；分发机制若过度设计（多分发模式、单例、全局钩子）会重蹈"为不存在的需求建机制"。

## Decision

- 落点 `packages/shared/src/events/bus.ts`，工厂函数 `createSessionEventBus()` 返回 `SessionEventBus`（on/emit/listenerCount）：不设全局单例，生命周期由消费方决定（前端 composable、后端 Nest provider 各自创建）。
- handler 类型用 `TypedSessionEvent<T>` 收窄：订阅 `'user_message'` 时 payload 具有 `UserMessagePayload` 类型，类型错误在订阅处即暴露。
- emit 词汇表外的类型抛 `EventVocabularyError`：与投影处 `deriveMessages` 的漂移防护对称——漂移必须在生产处暴露，而非静默丢失。运行时集合用 `as const satisfies readonly SessionEventType[]` 锚定词汇表。
- handler 异常 fail fast（不隔离、不吞错）：一个 handler 抛错中断本轮分发。隔离语义属于"分发模式"，按计划等真实消费者出现再增补。
- 中间件/拦截器事件钩子（计划 P1 项）后置：现有 compression/helmet/timeout 拦截器没有真实的事件消费者，挂钩子即是为不存在的需求建机制；第一个真实消费者（审计或 turn 管线）出现时再接。

## Alternatives considered

- 全局单例总线：前端模块热更新与后端 DI 各有不同的生命周期需求，单例会让测试隔离与 SSR 场景变复杂；工厂 + 消费方注入成本相同而灵活性更高。
- emit 静默忽略未知类型：坏事件无声丢失，违背"模型可见即已记录"同一族的 fail-fast 立场。
- handler 错误隔离（逐个 try/catch）：属于分发模式（bail/continue 语义选择），在没有任何真实消费者的现在做，选哪个语义都是猜。

## Consequences

- `@growth-os/shared` 新增公共导出：`createSessionEventBus` / `SessionEventBus` / `EventVocabularyError`；词汇表新增事件类型时需同步 `SESSION_EVENT_TYPES` 集合（遗漏会在 emit 合法事件时抛错暴露，与投影处双重防护）。
- 事件持久化（sessions 域）暂未接总线——事件目前直接落库；总线接入点等 turn/LLM 管线（事件的生产方）落地时一并设计。
