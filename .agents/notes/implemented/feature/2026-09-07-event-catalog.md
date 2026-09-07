# Agent Note: 生成式事件目录（阶段三 3.5）

Status: implemented

## Problem

会话事件词汇表（2.3）已有多个触点：类型定义、投影、总线、持久化、回放。事件相关的代码演进（加类型、改调用点）缺一张机器校验的全景视图，靠手写目录必然漂移。

## Decision

- 照 2.5 生成器框架（config-catalog/module-graph 同模式）落地 `scripts/generate-event-catalog.cjs`：`pnpm generate:events` 产出 `docs/event-catalog.md`，verify-docs 以"重跑生成器比对"做 freshness 门禁。
- 词汇表从 `packages/types/src/events/session.ts` 源码解析（MessageEventType/BookkeepingEventType union 字面量 + MessageEventPayloadMap 键值对）——types 源是唯一事实源，生成器不维护第二份类型清单。
- 扫描范围限定 `packages/{shared,types}/src`、`packages/shared/test`、`apps/server/{src,test}`、`apps/desktop/{app,test}` 的 `.ts`；目录内容为三节：词汇表、生产/消费调用点（符号级：`emit`/`appendEvent` 为生产，`on`/`deriveMessages`/`useSessionReplay` 为消费）、事件类型字面量的文件分布。

## Alternatives considered

- 生成器内硬编码 13 种事件类型：被否。词汇表演进时要同步两处，types 源码解析让清单只有一份。
- 语义级关联（哪个调用点生产哪个具体事件）：被否。需要 AST 数据流分析才能把事件对象与类型字面量关联，行级符号扫描（文件:行 + 符号名）已是机器校验视图的成本上限；更精确的映射等真实需要再上 AST。

## Consequences

- 词汇表新增事件类型时目录随 `pnpm generate:events` 自动更新；freshness 由 verify-docs 把关。
- 调用点扫描是符号级启发式：跨行调用、动态分发不在识别范围；新增生产/消费形态（如 SSE 推送）时扩展 `PRODUCER_SYMBOLS`/`CONSUMER_SYMBOLS` 即可。
