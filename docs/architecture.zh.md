# 架构地图

Growth OS 是一个类 Coze 的 AI 智能体桌面平台。本文描述当前组成与数据流；改 `packages/` 前先读。细节与理由在链接文档中，不在此处。

## 技术栈

| 层                   | 选型                                         |
| -------------------- | -------------------------------------------- |
| 桌面壳               | Electron 43（`packages/desktop-core`）       |
| 前端                 | Nuxt 4 + Vue 3 + Vite（`apps/desktop`）      |
| CSS / UI             | Tailwind CSS v4 + daisyUI 5（`packages/ui`） |
| 后端                 | NestJS + MikroORM（`apps/server`）           |
| 认证 / 数据库        | Supabase Auth + PostgreSQL                   |
| 构建                 | Turborepo + pnpm workspaces（catalogs）      |
| Lint / format / 测试 | oxlint + oxfmt + Vitest                      |

## 包拓扑

```
@growth-os/shared     (env/normalize 工具，零依赖)
@growth-os/types      (共享类型，IPC 通道契约)
@growth-os/ui         (设计系统组件与样式，daisyUI)
@growth-os/desktop-core (Electron 主进程/preload，独立)
        ↑
apps/desktop          (Nuxt 4；依赖 types、ui、desktop-core)
apps/server           (NestJS；依赖 shared)
```

共享配置在 `tooling/`：分层 TypeScript 预设（`tooling/typescript/`，见 [typescript-config.md](architecture/typescript-config.md)）、oxlint 规则、oxfmt 规则、Vitest 基础配置。

## 分层与数据流

1. **展示层**（`apps/desktop/app/`）：页面、布局、组件、composables。状态放在 composables（`useAuth`、`useSupabase`、`useSecureStorage`、`useToast`）；认证流程由 `.trae/rules/frontend/auth/` 治理。
2. **桥接层**（`packages/desktop-core/`）：Electron 主进程 + preload，通过 `contextBridge` 暴露最小 `window.desktop` API（`contextIsolation: true`、`nodeIntegration: false`）。IPC 通道在 `packages/types/src/utils/ipc-channels.ts` 中定义类型。
3. **API**（`apps/server/`）：NestJS 启动装配，含环境变量校验（`src/config/env.validation.ts`）与 MikroORM 接线；业务模块与实体尚未建立——schema/实体状态见 [database.zh.md](server/database.zh.md)。
4. **数据**（Supabase）：Auth 处理身份；PostgreSQL 通过 session pooler 连接串作为存储目标；RLS 按用户隔离尚在规划，尚未应用。
5. **UI 包**（`packages/ui/`）：可复用组件与语义样式 token（见 `.trae/rules/frontend/styles/`）。

```
user → Vue 组件 → composable → IPC (window.desktop) → desktop-core 处理器
                              └→ @growth-os/types（类型化通道）
                              └→ HTTP → NestJS → MikroORM → Supabase PostgreSQL
```

## 关键机制

- **认证**：supabase-js 客户端注入 secureStorage 持久化 token；存储前剥离 PII；登录状态来自 `getSession()`；过期/403 会话时仅本地登出。见 [flows.md](../.trae/rules/frontend/auth/flows.md) 与 [token.md](../.trae/rules/frontend/auth/token.md)。
- **环境变量**：dotenv-cli 级联——`pnpm dev` 加载 `.env` + `.env.development`，`pnpm build`/`start` 加载 `.env` + `.env.production`。客户端可见键为 `NUXT_PUBLIC_*`（构建期内联）。
- **Electron + Nuxt 集成**：`apps/desktop/modules/electron.ts` 通过 vite-plugin-electron 编译 main/preload 并在开发时启动 Electron；生产构建只编译（electron-builder 打包）。
- **动画**：组件切换用手写 GSAP + timeline（Nuxt 4 下 Vue `Transition mode="out-in"` + JS hooks 有 bug）；见 [animation.md](../.trae/rules/frontend/styles/animation.md)。
- **数据库（server）**：通过 `apps/server/mikro-orm.config.ts` 使用 MikroORM，连接 session pooler 串；迁移与种子在 `infra/database/`，由 `mikro-orm:*` 脚本运行。见 [database.zh.md](server/database.zh.md)。

## 变更指引

- `packages/` 新增功能 → 先读本地图，再读所属包 README 与相关 `.trae/rules/` 文件。
- 架构决策与被否方案 → 同一变更中在 `.agents/notes/` 写 Agent Note（见 [notes README](../.agents/notes/README.md)）。
