## Purpose

定义业务域整体拆除后服务端保留下来的对外行为契约：平台底盘（鉴权、健康探针、审计查询、限流）继续可用，被拆除的 5 组业务路径不再存在。该能力是后续逐域重建变更的基线——每个重建变更以 ADDED Requirements 的方式恢复对应业务行为。

## Requirements

### Requirement: 业务域端点不再存在

服务端 SHALL 不再暴露 agents / skills / projects / files / sessions 五组业务路径（含其子路径）；对这些路径的任何请求 SHALL 返回 404，且响应体 SHALL 符合 ApiErrorEnvelope 结构（{ code, message }）。

#### Scenario: 业务列表端点返回 404

- **WHEN** 客户端携带有效 Bearer token 请求 `GET /api/v1/agents`
- **THEN** 服务端返回 404，响应体为 ApiErrorEnvelope 格式

#### Scenario: 业务写端点同样不可达

- **WHEN** 客户端携带有效 Bearer token 请求 `POST /api/v1/sessions` 或 `POST /api/v1/files`
- **THEN** 服务端返回 404，响应体为 ApiErrorEnvelope 格式

### Requirement: 平台底盘端点保持可用

服务端 SHALL 继续暴露并保持以下端点行为不变：`GET /api/v1/health/liveness`（200）、`GET /api/v1/health/readiness`（DB 可达 200 / 不可达 503）、`GET /api/v1/auth/me`（经全局鉴权）、`GET /api/v1/audit-logs`（经全局鉴权，200 返回 { data } 信封）。

#### Scenario: 健康探针不受拆除影响

- **WHEN** 数据库可达时请求 `GET /api/v1/health/readiness`
- **THEN** 服务端返回 200

#### Scenario: 审计查询端点保持可用

- **WHEN** 客户端携带有效 Bearer token 请求 `GET /api/v1/audit-logs`
- **THEN** 服务端返回 200，响应体为 { data } 信封，历史审计行仍可按既有过滤参数检索

### Requirement: 全局鉴权与限流不变

除公开端点外，所有路由 SHALL 继续要求 Bearer token（全局 JWT 守卫）；限流策略 SHALL 继续对所有路由生效。拆除业务域不得改变这两个横切行为。

#### Scenario: 无 token 访问平台端点被拒

- **WHEN** 客户端不携带 token 请求 `GET /api/v1/audit-logs`
- **THEN** 服务端返回 401，响应体为 ApiErrorEnvelope 格式

#### Scenario: 限流仍然生效

- **WHEN** 短时间内请求次数超过限流阈值
- **THEN** 服务端返回 429，响应体为 ApiErrorEnvelope 格式

### Requirement: 数据库仅保留平台表

业务表（agents / skills / projects / session_records / session_events）SHALL 从数据库中移除；`audit_logs` 表 SHALL 保留且其历史数据可查询。迁移历史 SHALL 重新基线化，使迁移链与实体定义一致。

#### Scenario: 业务表已移除

- **WHEN** 检查数据库 public schema 的业务表
- **THEN** agents、skills、projects、session_records、session_events 表不存在，audit_logs 表存在

#### Scenario: 迁移链可完整重放

- **WHEN** 在空数据库上按序执行全部迁移
- **THEN** 迁移全部成功，最终 schema 仅含平台表（audit_logs）

### Requirement: API 文档与实现一致

OpenAPI 文档（`/docs-json`）SHALL 不再包含任何已拆除业务域的路径，SHALL 继续描述保留的平台端点（health / auth / audit-logs），且文档中的 schema 与响应信封约定保持有效。

#### Scenario: 文档不含业务路径

- **WHEN** 请求 `GET /docs-json` 并检查 paths
- **THEN** 不存在 `/agents` `/skills` `/projects` `/files` `/sessions` 前缀的路径，存在 `/health` `/auth` `/audit-logs` 路径
