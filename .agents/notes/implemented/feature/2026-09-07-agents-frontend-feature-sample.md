# Agent Note: agents 域前端 feature 化样板（typed client + composable）

Status: implemented

## Problem

迭代计划 2.6 规定前端传输与业务分离——`useApi` 只管传输层，每个产品域一组 typed client 与域 composable，页面只做组装。但仓库里没有任何 `app/features/` 落地，约定停留在计划文本；agents 域是第一个要填的样板，后续四域（sessions/skills/files/projects）都会照抄这个形状。

## Decision

`app/features/agents/` 两文件构成域 feature 的标准形状：

- `api.ts`：`agentsApi` 单导出对象，完整镜像 `AgentsApiMap` 的五个端点；入参/返回用 `EndpointRequest`/`EndpointResponse` 从契约派生，模块内不声明业务类型；路径参数在此拼接。
- `use-agents.ts`：`useAgents()` 每次调用独立建状态（非模块单例）；暴露列表状态（`agents`/`isLoading`）与 `refresh`/`createAgent`/`renameAgent`；错误一律透传 `ApiError`，不做 UI 反馈（与 `AuthService` 的"不吞错"约定一致）。

首个消费方是 `components/sidebar/agent-menu.vue`：挂载时拉取真实列表，空列表退回内置占位「小芽」（id 为空串标识非持久化实体，重命名/置顶仅写本地状态）；真实 Agent 的重命名走 PATCH，新建走 POST——骨架期写路径 501 的错误信封文案经 toast 透出，这就是设计的骨架行为。

## Alternatives considered

- **composable 内聚 toast 提示**——否决：把 UI 反馈耦合进域逻辑，与 `useAuth`/`AuthService` 已确立的错误约定冲突；提示方式属于调用方。
- **api.ts 按端点导出五个独立函数**——否决：未被 UI 消费的导出会被 knip 判为 unused exports；单对象导出既保持完整契约镜像，又只产生一个被消费的模块出口。
- **菜单完全不动，样板只交付不接线**——否决：无消费方的 feature 层是死代码样态，传输与组装链路得不到真实验证；但页面级组装（agent 管理 UI）推迟到持久化落地，避免对空后端造列表页。
- **占位「小芽」改为真实 Agent 种子数据**——否决：后端骨架无持久化，种子数据无处存放；空态保底是纯前端行为，语义诚实。

## Consequences

- 后端 Agent 持久化落地后，侧边栏自动展示真实列表，重命名/新建即时生效，无需改 feature 层。
- 四域 typed client 已照抄 `api.ts` 形状落地（`features/{sessions,skills,files,projects}/api.ts` + 各自镜像测试）；域 composable 暂不迁移——四个 dashboard 页面均为空壳、无真实消费方，先落 `use-<domain>.ts` 是死代码样态，待业务实现接线时再照抄 `use-agents.ts`。
- `apiFetch` 增加 FormData 透传分支：files 域上传按契约是 multipart/form-data（file 二进制 + name/mimeType 表单字段），Content-Type（含 boundary）交由浏览器生成，JSON 分支行为不变。这是传输层职责，不算业务膨胀。
- `useSessionReplay` 的手拼 `/sessions/:id/events` 路径收敛到 `sessionsApi.events()`——域 typed client 是路径拼接的唯一家，回放消费路径不变（仍走 apiFetch 链路）。
- `systemPrompt` 留空与默认模型 `deepseek-chat` 内置在菜单组件——模型配置目录（config-catalog 扩展）落地后应改为从配置读取。
