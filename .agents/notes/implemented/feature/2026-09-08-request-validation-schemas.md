# Agent Note: 请求校验 schema 共置与管道挂载

Status: implemented

## Problem

`ZodValidationPipe` 已存在但零挂载：五个域 controller 的 body/query 均为裸 DTO，非法入参直达 service 层才失败，错误码与细节不可预期——后端审查列出的 P1 骨架缺陷。

## Decision

- 入参 schema 与类型同置 `@growth-os/types`（`createXxxSchema` + `z.infer` 导出类型），前后端共用同一份校验与类型，替代手写 input 类型；schema 即契约的一部分，与 `ApiMap` 并列维护。
- controller 挂载 `ZodValidationPipe`：sessions（create/send/fork/update body）、agents/skills/projects（create/update body）、audit（query，数值字段用 `z.coerce.number()` 适配 query 字符串）。
- 校验失败抛 `BadRequestException`，经 `AllExceptionsFilter` 归一为 ApiErrorEnvelope（code=`VALIDATION_ERROR`，details 携带逐字段 issues）。
- `AuditService.record(entry, em?)` 接受可选外部 EM：事务内调用方传入事务 EM，使审计与业务写入同事务提交（代码对齐 audit-log note 已声明的行为）；缺省仍独立 fork。`sessions.remove` 已传入事务 EM。
- 列表排序列补索引：agents/skills/projects/session_records 的 `updatedAt`（迁移 `Migration20260908143835_list_order_indexes`）。

## Alternatives considered

- class-validator DTO：弃。仓库校验技术栈已选 zod（env 校验同构），双栈徒增维护面。
- 校验留在 service 层：弃。协议校验属于 HTTP 边界职责，service 校验无法生成统一 400 信封，且前端无法复用。

## Consequences

- `@growth-os/types` 导出全部入参 schema；前端表单/IPC 侧后续直接复用同一 schema。
- 新增域端点时按同模式挂管道；漏挂无静态检查兜底（依赖评审），若成为反复出现的问题再考虑脚本化检查。
