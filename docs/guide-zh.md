# Growth OS 开发导读（中文索引）

本文件是给开发人员阅读的中文导航：**只索引、不转述**。规则正文以英文真相文件为准，改规则只改英文文件，本文件仅在结构变化时同步索引。机器侧的单一事实源是 [AGENTS.md](../AGENTS.md)。

## 规则（.trae/rules，英文真相）

按需加载；每类规则各管一块，点击进入英文原文。

### 前端认证（frontend/auth/）

- [credentials.md](../.trae/rules/frontend/auth/credentials.md) — 测试账号只放根 `.env`，规则只引用变量名
- [flows.md](../.trae/rules/frontend/auth/flows.md) — 登录/登出/403 兜底流程
- [token.md](../.trae/rules/frontend/auth/token.md) — secureStorage 会话持久化，PII 剥离

### 前端样式（frontend/styles/）

- [animation.md](../.trae/rules/frontend/styles/animation.md) — GSAP 动画，禁用 Vue Transition out-in（Nuxt 4 bug）
- [colors.md](../.trae/rules/frontend/styles/colors.md) — 只用语义色 token，不硬编码色值
- [conflict.md](../.trae/rules/frontend/styles/conflict.md) — 外部样式覆盖走 class 透传 + `cn()` 合并
- [fonts.md](../.trae/rules/frontend/styles/fonts.md) — 品牌字体本地化，中文字体 unicode-range 拆分
- [performance.md](../.trae/rules/frontend/styles/performance.md) — 样式性能与构建产物检查
- [responsive.md](../.trae/rules/frontend/styles/responsive.md) — 移动优先响应式
- [reuse.md](../.trae/rules/frontend/styles/reuse.md) — 重复 3+ 次的类组合抽成 UI 组件
- [structure.md](../.trae/rules/frontend/styles/structure.md) — 样式文件组织
- [themes.md](../.trae/rules/frontend/styles/themes.md) — 主题切换，页面不锁 data-theme

### 前端测试（frontend/tests/）

- [assertions.md](../.trae/rules/frontend/tests/assertions.md) — 断言与类型安全（禁止非空断言、禁止 any）
- [commands.md](../.trae/rules/frontend/tests/commands.md) — 验证顺序 test → typecheck → lint
- [coverage.md](../.trae/rules/frontend/tests/coverage.md) — 覆盖原则：测行为不测实现
- [environment.md](../.trae/rules/frontend/tests/environment.md) — @nuxt/test-utils 环境
- [isolation.md](../.trae/rules/frontend/tests/isolation.md) — 测试隔离
- [mock.md](../.trae/rules/frontend/tests/mock.md) — 禁止真实调用外部服务
- [structure.md](../.trae/rules/frontend/tests/structure.md) — 测试目录结构

### 提交规范

- [git-commit-message.md](../.trae/rules/git-commit-message.md) — conventional commits，subject 语言与改动一致

### 后端认证（server/auth/）

- [verification.md](../.trae/rules/server/auth/verification.md) — JWT 双轨验证（JWKS 本地 + HS256 Auth 探针）
- [guard.md](../.trae/rules/server/auth/guard.md) — SupabaseJwtGuard、@Public、@CurrentUser

### 后端数据库（server/database/）

- [orm.md](../.trae/rules/server/database/orm.md) — MikroORM v7 配置、entity 放置、@InjectMikroORM('default')
- [migrations.md](../.trae/rules/server/database/migrations.md) — 迁移工作流（create/up/down）

### 后端 API（server/api/）

- [errors.md](../.trae/rules/server/api/errors.md) — ApiErrorEnvelope、AllExceptionsFilter、STATUS_CODE_MAP
- [responses.md](../.trae/rules/server/api/responses.md) — ResponseEnvelopeInterceptor、{data: T} 信封
- [health.md](../.trae/rules/server/api/health.md) — 健康探针双层（liveness 200, readiness 503）

### 后端中间件（server/middleware/）

- [compression.md](../.trae/rules/server/middleware/compression.md) — 响应压缩，SSE 排除（includes 匹配）
- [helmet.md](../.trae/rules/server/middleware/helmet.md) — 安全头，CSP 仅生产环境
- [timeout.md](../.trae/rules/server/middleware/timeout.md) — 请求超时，@SkipTimeout 用于 SSE

### 后端测试（server/tests/）

- [structure.md](../.trae/rules/server/tests/structure.md) — 测试目录结构（co-located spec + e2e）
- [mock.md](../.trae/rules/server/tests/mock.md) — Mock 策略（jest.mock for ESM, fake timers）
- [commands.md](../.trae/rules/server/tests/commands.md) — 测试命令与验证顺序

## 专家（.trae/agents）

按 description 触发：auth / style / test 三个前端专家。

## 文档（docs/）

- [architecture.md](architecture.md) — 架构有序地图（英文，真相源），改 `packages/` 前先读
- [architecture.zh.md](architecture.zh.md) — 架构有序地图（中文镜像）
- [database.md](server/database.md) — 后端数据库与 ORM 工作流（英文）
- [database.zh.md](server/database.zh.md) — 后端数据库与 ORM 工作流（中文镜像）
- [desktop/architecture.md](desktop/architecture.md) — Desktop 前端与桌面壳架构（英文，真相源）
- [desktop/architecture.zh.md](desktop/architecture.zh.md) — Desktop 前端与桌面壳架构（中文镜像）
- [architecture/typescript-config.md](architecture/typescript-config.md) — TypeScript 分层配置设计（中文）
- [i18n/README.md](i18n/README.md) — 双文配对契约（hash 校验，改双文文档后 `pnpm verify:pairing --write` 重录）
- [i18n/terminology.md](i18n/terminology.md) — 双文翻译术语对照表
- [AGENTS.md](AGENTS.md) — 文档治理标准（英文）：事实分层 + 写作规则 + slop checklist

## 决策库（.agents/notes/）

Agent Notes 记录"为什么"（Problem → Decision → Alternatives → Consequences），[README](../.agents/notes/README.md) 定义契约。非平凡改动同一变更中带 note。

## 技能（skills）

`.agents/skills/`（Agent Skills 规范）与 `.trae/skills/`（Trae 项目技能）按 description 按需加载。

## 文档门禁

`pnpm verify:docs` 校验：CLAUDE.md 保持薄指针（指向 [AGENTS.md](../AGENTS.md)）、相对链接有效、字数预算、双文配对 hash。提交前 pre-commit 自动运行；CLAUDE.md 被改动会被拦截，用 `node scripts/verify-docs.cjs --sync` 恢复；双文文档两侧漂移会被拦截，用 `pnpm verify:pairing --write <path>` 重录。
