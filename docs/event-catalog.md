# Event catalog

> **Generated** by [generate-event-catalog.cjs](../scripts/generate-event-catalog.cjs) — do not edit by hand.
> `pnpm verify:docs` fails when this file is stale; regenerate with `pnpm generate:events` and commit.
> The vocabulary itself lives in [packages/types/src/events/session.ts](../packages/types/src/events/session.ts); this catalog is the machine-checked producer/consumer view.

## 词汇表

| 事件 | 类别 | Message payload |
| --- | --- | --- |
| `user_message` | message | UserMessagePayload |
| `assistant_message` | message | AssistantMessagePayload |
| `tool_call` | message | ToolCallPayload |
| `tool_result` | message | ToolResultPayload |
| `system_prompt` | message | SystemPromptPayload |
| `context_injection` | message | ContextInjectionPayload |
| `turn_start` | bookkeeping | 自定义 |
| `turn_end` | bookkeeping | 自定义 |
| `step_start` | bookkeeping | 自定义 |
| `step_end` | bookkeeping | 自定义 |
| `condensation` | bookkeeping | 自定义 |
| `agent_created` | bookkeeping | 自定义 |
| `agent_status_changed` | bookkeeping | 自定义 |

## 生产 / 消费调用点

**Producers**（11）：

- `apps/server/src/modules/sessions/sessions.service.ts:151 (appendEvent)`
- `apps/server/src/modules/sessions/turn.service.ts:41 (appendEvent)`
- `apps/server/test/modules/sessions/sessions.service.test.ts:200 (appendEvent)`
- `apps/server/test/modules/sessions/sessions.service.test.ts:217 (appendEvent)`
- `packages/shared/test/events/bus.test.ts:27 (bus emit)`
- `packages/shared/test/events/bus.test.ts:41 (bus emit)`
- `packages/shared/test/events/bus.test.ts:60 (bus emit)`
- `packages/shared/test/events/bus.test.ts:61 (bus emit)`
- `packages/shared/test/events/bus.test.ts:71 (bus emit)`
- `packages/shared/test/events/bus.test.ts:76 (bus emit)`
- `packages/shared/test/events/bus.test.ts:89 (bus emit)`

**Consumers**（23）：

- `apps/desktop/app/composables/useSessionReplay.ts:15 (useSessionReplay)`
- `apps/desktop/app/composables/useSessionReplay.ts:19 (deriveMessages)`
- `apps/desktop/test/nuxt/session-replay.test.ts:43 (useSessionReplay)`
- `apps/desktop/test/nuxt/session-replay.test.ts:7 (useSessionReplay)`
- `apps/desktop/test/nuxt/session-replay.test.ts:72 (useSessionReplay)`
- `apps/server/src/modules/sessions/sessions.service.ts:260 (deriveMessages)`
- `packages/shared/src/session-events.ts:59 (deriveMessages)`
- `packages/shared/test/events/bus.test.ts:24 (bus on)`
- `packages/shared/test/events/bus.test.ts:25 (bus on)`
- `packages/shared/test/events/bus.test.ts:34 (bus on)`
- `packages/shared/test/events/bus.test.ts:56 (bus on)`
- `packages/shared/test/events/bus.test.ts:57 (bus on)`
- `packages/shared/test/events/bus.test.ts:84 (bus on)`
- `packages/shared/test/events/bus.test.ts:87 (bus on)`
- `packages/shared/test/session-events.test.ts:12 (deriveMessages)`
- `packages/shared/test/session-events.test.ts:47 (deriveMessages)`
- `packages/shared/test/session-events.test.ts:51 (deriveMessages)`
- `packages/shared/test/session-events.test.ts:61 (deriveMessages)`
- `packages/shared/test/session-events.test.ts:62 (deriveMessages)`
- `packages/shared/test/session-events.test.ts:73 (deriveMessages)`
- `packages/shared/test/session-events.test.ts:84 (deriveMessages)`
- `packages/shared/test/session-events.test.ts:95 (deriveMessages)`
- `packages/types/src/events/session.ts:153 (deriveMessages)`

## 事件类型引用分布

| 事件 | 引用文件数 | 文件 |
| --- | --- | --- |
| `user_message` | 12 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/events/bus.test.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/server/src/modules/sessions/turn.service.ts`<br>`apps/server/test/modules/sessions/entities/session-event.entity.test.ts`<br>`apps/server/test/modules/sessions/sessions.service.test.ts`<br>`apps/server/test/modules/sessions/turn.service.test.ts`<br>`apps/desktop/test/fixtures/session-recording.ts`<br>`apps/desktop/test/nuxt/sessions-api.test.ts` |
| `assistant_message` | 10 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/server/src/modules/sessions/turn.service.ts`<br>`apps/server/test/modules/sessions/entities/session-event.entity.test.ts`<br>`apps/server/test/modules/sessions/sessions.service.test.ts`<br>`apps/server/test/modules/sessions/turn.service.test.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `tool_call` | 5 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/types/src/events/session.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `tool_result` | 7 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/events/bus.test.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `system_prompt` | 5 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/types/src/events/session.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `context_injection` | 5 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/types/src/events/session.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `turn_start` | 11 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/events/bus.test.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/server/src/modules/sessions/sessions.service.ts`<br>`apps/server/src/modules/sessions/turn.service.ts`<br>`apps/server/test/modules/sessions/sessions.service.test.ts`<br>`apps/server/test/modules/sessions/turn.service.test.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `turn_end` | 10 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/server/src/modules/sessions/sessions.service.ts`<br>`apps/server/src/modules/sessions/turn.service.ts`<br>`apps/server/test/modules/sessions/sessions.service.test.ts`<br>`apps/server/test/modules/sessions/turn.service.test.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `step_start` | 7 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/server/src/modules/sessions/sessions.service.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `step_end` | 7 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/events/bus.test.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/server/src/modules/sessions/sessions.service.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `condensation` | 6 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/events/bus.test.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts` |
| `agent_created` | 5 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts`<br>`apps/desktop/test/fixtures/session-recording.ts` |
| `agent_status_changed` | 5 | `packages/shared/src/events/bus.ts`<br>`packages/shared/src/session-events.ts`<br>`packages/shared/test/session-events.fixture.ts`<br>`packages/shared/test/session-events.test.ts`<br>`packages/types/src/events/session.ts` |
