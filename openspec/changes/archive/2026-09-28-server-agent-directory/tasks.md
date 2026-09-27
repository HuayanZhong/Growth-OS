# Tasks: Agent 目录服务端化（server-agent-directory）

## 1. 跨端契约（packages/types）

- [x] 1.1 新建 `src/api/agents.ts`：`agentSchema`（slug/name/emotion/color?/description?/skills?/isDefault boolean）+ `createAgentSchema`（name 必填去空白非空、emotion 必填、color/description/skills 可选）+ `AgentApiMap`（POST /agents、GET /agents、DELETE /agents/:slug）；`src/index.ts` barrel 导出 ｜ 验证：`pnpm --filter @growth-os/types typecheck` 绿（包无 build 脚本，消费方直引 src）

## 2. server 模块（apps/server）

- [x] 2.1 新建 `modules/agents/entities/agent.entity.ts`：`AgentEntity`（tableName `agents`；id text 主键、user_id nullable、slug/name/emotion not null、color/description null、skills jsonb null、is_default bool 默认 false、createdAt）+ 行→契约映射函数；`agents.module.ts` 挂 `MikroOrmModule.forFeature([AgentEntity], 'default')` 并注册到 AppModule ｜ 验证：`pnpm --filter server typecheck` 绿
- [x] 2.2 新建 `agents.service.ts` 与 `agents.controller.ts`：create（slug `agent-` + randomUUID 前 8 位冲突重试、userId 取 @CurrentUser sub）、list（默认行在前 + 本人自建升序）、remove（is_default 行抛 403 错误码、非本人/不存在 404）；controller 三端点挂 ZodValidationPipe/createAgentSchema 与 OpenApi 装饰，风格对齐 audit ｜ 验证：`pnpm --filter server typecheck` 绿
- [x] 2.3 service/controller 单测（mock ORM）：创建成功落库并返回契约数据、入参非法 400、列表排序与默认行在前、删除成功、默认行删除 403、他人记录 404 ｜ 验证：`pnpm --filter server test` 全绿
- [x] 2.4 迁移：`pnpm mikro-orm:migration:create` 生成建表迁移，手工补 RLS policy（`user_id = auth.uid() or is_default = true`）、user_id 索引与 seed 行（xiaohuayan，is_default true），`pnpm mikro-orm:migration:up` 应用；服务端 CRUD 冒烟（对本地起的服务 create/list/delete 各一次，delete xiaohuayan 应 403）｜ 验证：`pnpm mikro-orm:debug` 无 pending；冒烟行为符合 spec

## 3. 前端切换（apps/desktop）

- [x] 3.1 类型源迁移：删除 `app/types/agents.ts` 与 `BUILT_IN_AGENTS` 常量，全局把 `AgentEntry`/`CreateAgentInput` 的 import 源改为 `@growth-os/types`（utils/agents.ts、useAgents.ts、useCreateAgentForm.ts 及组件消费方一次改齐）｜ 验证：`pnpm --filter desktop typecheck` 绿
- [x] 3.2 `useAgents.ts` 改造：移除 localStorage（initAgents/persist/storage 参数全删）；`loadAgents()`（apiFetch GET /agents，失败回退空目录）+ `loaded` 标志；`createAgent` 变 async（POST）；新增 `removeAgent(slug)`（DELETE + 目录移除 + 清理 useAgentChat 对应会话）；`getDefaultAgent` 可空化；保留测试隔离 reset ｜ 验证：`pnpm --filter desktop exec vitest run test/unit/use-agents.test.ts` 改造后全绿
- [x] 3.3 加载时机接线：登录会话就绪处触发 `loadAgents()`（沿用项目现有登录后初始化点位），登出清空目录 ｜ 验证：`pnpm --filter desktop exec vitest run test/nuxt/` 全绿
- [x] 3.4 `useCreateAgentForm.ts`：submit 变 async（submitting 禁用态 + error ref），成功后 navigateTo；`CreateAgentModal.vue` 呈现错误（不关弹窗、保留表单）｜ 验证：`pnpm --filter desktop exec vitest run test/nuxt/create-agent-modal.test.ts` 改造后全绿
- [x] 3.5 删除交互：`app-sidebar.vue` 自建条目 hover 删除图标 + 二次确认弹窗（默认条目无入口），确认后调 `removeAgent`，失败提示；当前路由为被删 agent 页时 navigateTo 默认 agent 开场页 ｜ 验证：`pnpm --filter desktop exec vitest run test/nuxt/` 全绿
- [x] 3.6 agent 页 404 判定门控与空目录防御：`[id].vue` 仅在 `loaded === true` 后判 404；tasks/new 等调用点适配 `getDefaultAgent` 可空语义（空目录禁用发送/空态）｜ 验证：`pnpm --filter desktop exec vitest run test/nuxt/agent-page.test.ts` 全绿

## 5. 评审修正（apply 期用户反馈）

- [x] 5.1 名称唯一：service 同用户查重 409 AGENT_NAME_EXISTS + 迁移补 (user_id, name) partial unique index 兜底 + spec「同用户重名拒绝」场景 ｜ 验证：`pnpm --filter server test` 全绿；重名请求实测 409
- [x] 5.2 删除传参改主键 id：契约 Agent 加 id、DELETE /agents/:id、controller/service/前端 removeAgent 同步（slug 仅用于路由与会话清理）｜ 验证：server/desktop 测试全绿
- [x] 5.3 service 数据访问风格：尝试对齐参考实现（nest-Aedium）的 @InjectRepository 直注——本项目 app.module 关闭 request context，全局 EM 上下文操作被 v7 禁止（实测 500 ValidationError），保留 InjectMikroORM + fork 并在 service 注释记录缘由；重开 request context 的复评估记 backlog ｜ 验证：`pnpm --filter server test` + typecheck 绿；HTTP 实测 list/create/remove 全部正常
- [x] 5.4 删除体验复查：删除当前页 Agent 无整页 reload、导航平滑；确认弹窗后先离页再删（404 门控竞争已修）｜ 验证：浏览器实测删除链路，console 无新增错误

## 6. 全量验证与登记

- [x] 6.1 全仓验证：`pnpm test` → `pnpm typecheck` → `pnpm lint` → `pnpm verify` 全绿 ｜ 验证：四命令退出码均为 0
- [x] 6.2 浏览器冒烟：登录 → 目录含小花颜 → 创建自定义 Agent → 即时可见 → 删除该 Agent（含确认弹窗与路由跳转）→ 重启重登后小花颜仍在且被删 Agent 不在 → 小花颜无删除入口 ｜ 验证：桌面窗口操作通过，控制台无未处理错误
- [x] 6.3 归档后登记 thin Agent Note（链接本 change，记录「内置 seed 入库 + 补删除」推翻原「永不写盘」决策），`pnpm verify:docs` 绿 ｜ 验证：`pnpm verify:docs` 退出码 0
