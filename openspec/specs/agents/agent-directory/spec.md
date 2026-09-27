# agents/agent-directory Specification

## Purpose

服务端 Agent 目录：为每个登录用户提供自定义 Agent 的创建、列表与删除能力，并以内置默认 Agent（seed 行）作为目录的固定成员，作为前端目录的唯一数据源与后续 AI 编排「按 agent 配置执行」的配置来源。

## Requirements

### Requirement: 创建 Agent 端点

服务端 SHALL 提供 POST /api/v1/agents 创建自定义 Agent：请求体经 createAgentSchema 校验（name 必填、去除空白后非空；emotion 必填；color、description、skills 可选），名称 SHALL 在「默认 Agent + 本人自建 Agent」范围内唯一（与默认 Agent 同名或与本人已有 Agent 同名均返回 409 AGENT_NAME_EXISTS）；slug 与 id 由服务端生成且唯一，归属用户取自 JWT sub，isDefault 恒为 false。成功响应 SHALL 返回创建后的完整 Agent 数据（经响应信封包装）。

#### Scenario: 创建成功

- **WHEN** 携带有效 Bearer JWT 与合法入参请求 POST /api/v1/agents
- **THEN** 服务端落库一行 agents 记录（user_id = JWT sub），返回新 Agent 数据，slug 与 id 为服务端生成的唯一值

#### Scenario: 与默认 Agent 同名拒绝

- **WHEN** 用户创建的名称与内置默认 Agent（小花颜）相同
- **THEN** 返回 409 与错误码 AGENT_NAME_EXISTS，不落库

#### Scenario: 同用户重名拒绝

- **WHEN** 用户创建的名称与其已有自定义 Agent 相同
- **THEN** 返回 409 与错误码 AGENT_NAME_EXISTS，不落库

#### Scenario: 入参非法

- **WHEN** 请求体未通过 createAgentSchema 校验（如 name 为空或仅空白）
- **THEN** 返回 400 与 ApiErrorEnvelope 错误信封，不落库

#### Scenario: 未认证

- **WHEN** 请求未携带有效 Bearer JWT
- **THEN** 返回 401，不落库

### Requirement: 目录列表端点

服务端 SHALL 提供 GET /api/v1/agents 返回目录：内置默认 Agent（seed 行，isDefault = true）在前，其后为当前用户自建的 Agent（仅 JWT sub 归属记录，按创建时间升序）。

#### Scenario: 列表含默认与本人 Agent

- **WHEN** 用户已创建若干自定义 Agent 后请求 GET /api/v1/agents
- **THEN** 响应以默认 Agent 开头，其后仅跟该用户自建的 Agent，按创建时间升序排列

#### Scenario: 无自建 Agent

- **WHEN** 用户从未创建过自定义 Agent
- **THEN** 响应仅包含默认 Agent 一条

### Requirement: 删除 Agent 端点

服务端 SHALL 提供 DELETE /api/v1/agents/:id 删除自定义 Agent（path 参数为主键 id，slug 仅用于前端路由不做资源定位）：仅删除 JWT sub 归属且 isDefault 为 false 的记录；删除成功返回确认响应。默认 Agent 与非本人记录 SHALL 拒绝删除。

#### Scenario: 删除成功

- **WHEN** 携带有效 Bearer JWT 请求 DELETE /api/v1/agents/<本人自建 Agent 的 id>
- **THEN** 对应记录被删除，返回确认响应；再次请求目录列表时该 Agent 不再出现

#### Scenario: 默认 Agent 拒绝删除

- **WHEN** 请求 DELETE /api/v1/agents/<默认 Agent 的 id>
- **THEN** 返回 403 与 ApiErrorEnvelope 错误信封（机器可读错误码），记录不删除

#### Scenario: 他人或不存在记录返回 404

- **WHEN** 请求 DELETE /api/v1/agents/<不存在或不归属当前用户的 id>
- **THEN** 返回 404 与错误信封，不泄露他人资源的存在性

#### Scenario: 未认证

- **WHEN** 删除请求未携带有效 Bearer JWT
- **THEN** 返回 401，记录不删除

### Requirement: 用户隔离

Agent 数据 SHALL 按用户隔离：服务端读写均以 JWT sub 归属为准（默认 Agent seed 行除外，其对所有登录用户只读可见），数据库层 SHALL 对 agents 表启用 RLS 且 policy 限定「user_id = auth.uid() 或 is_default = true」；任何用户无法通过 API 读取或写入他人 Agent。

#### Scenario: 越权不可见

- **WHEN** 用户 A 请求目录列表，而某自定义 Agent 归属用户 B
- **THEN** 该 Agent 不出现在 A 的列表响应中

### Requirement: 内置默认 Agent seed

迁移 SHALL 为 agents 表 seed 一条内置默认 Agent（slug 固定 xiaohuayan，name「小花颜」，isDefault = true，user_id 为空），全局仅此一行；该行对所有登录用户可见且只读（API 层无创建/更新/删除通路）。

#### Scenario: 迁移后默认 Agent 就位

- **WHEN** 迁移应用完成
- **THEN** agents 表中存在且仅存在一条 isDefault = true 的记录（slug = xiaohuayan）

### Requirement: 目录页状态呈现

目录页 SHALL 依据目录加载状态呈现四种互斥状态：加载中（不呈现错误或空态文案）、加载失败（呈现错误提示与重试动作，重试 SHALL 重新拉取目录并按结果切换状态）、目录为空（加载成功但无默认 Agent 时呈现空态提示，发送入口不可用）、就绪（呈现问候语与发送入口）。加载失败态的提示 SHALL NOT 引导用户重新登录。

#### Scenario: 加载中不闪现错误文案

- **WHEN** 目录请求进行中（尚未成功或失败）
- **THEN** 页面不呈现加载失败或目录为空的提示文案

#### Scenario: 加载失败呈现可重试错误态

- **WHEN** 目录请求失败且会话仍有效（如服务端 500 或网络中断）
- **THEN** 页面呈现错误提示与重试动作，不出现"重新登录"引导；点击重试后重新拉取目录，成功则进入就绪态，仍失败则维持错误态

#### Scenario: 会话失效时由认证边界接管

- **WHEN** 目录请求因会话失效收到 401 且会话刷新失败
- **THEN** 页面不呈现目录错误态，应用清除本地会话并导航至登录页

#### Scenario: 目录为空呈现空态

- **WHEN** 目录请求成功但响应中不存在 isDefault 为 true 的条目
- **THEN** 页面呈现空态提示，发送入口不可用

#### Scenario: 就绪态可用

- **WHEN** 目录请求成功且存在默认 Agent
- **THEN** 页面呈现问候语与发送入口，发送入口可用
