# NestJS 12 升级 + server 测试栈迁 Vitest 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/server` 分两阶段升级：阶段一在 NestJS 11 上把测试栈从 Jest 迁到 Vitest 并跑绿；阶段二升 NestJS 12，产出"合入 or 挂起"结论。

**Architecture:** 阶段一先行是因为两者耦合：NestJS 12 全家转 ESM 包，而本仓库已实证 Jest CJS 运行时无法 require ESM-only 包（见下），Jest 路线在 v12 下必然失败；Vitest 原生 ESM 无此问题。先迁 Vitest 再升 v12，避免两处变更叠加排查。阶段一独立有价值：即使阶段二受阻也可单独保留。

**Tech Stack:** Vitest 4（catalog 已有）、NestJS 12（ESM 包）、pnpm catalog、MikroORM 7、supertest、unplugin-swc（条件引入）

---

## 背景事实（调研 + 仓库实测，2026-08-28）

### 为什么必须先迁 Vitest

- [e2e-app.ts](../../../apps/server/test/e2e-app.ts) 注释原文：「MikroORM 为 v7 ESM-only 包，Jest CJS 运行时无法 require」。仓库在 Jest 30 下已踩实这堵墙。
- NestJS 12.0.0（2026-08-27 发布）所有官方包转为 ESM（`@nestjs/config@12` 实测 `"type": "module"` 且 exports 无 `require` 分支）。v12 之后 server 任何 spec import `@nestjs/common` 都会踩同一堵墙。
- 结论：Jest 无存活路径，Vitest 迁移是升 v12 的硬前提，不是可选项。

### DI 元数据约束（阶段一的唯一技术风险）

- [nest.json](../../../tooling/typescript/framework/nest.json) 开启 `experimentalDecorators` + `emitDecoratorMetadata`；e2e 的 `Test.createTestingModule` 依赖该元数据做依赖注入。
- ts-jest（tsc）产出元数据；Vitest 的转换器不产出。单元测试全部手动 `new Service(mock)` 不经过 DI 容器，不受影响；只有 e2e 受影响。
- Task 4 用 health e2e 实测：DI 报错则引入 unplugin-swc（SWC 支持 `decoratorMetadata`），这是 NestJS + Vitest 的成熟配方。

### 生态兼容（npm 实测）

| 包                              | 目标版本                      | peer 对 @nestjs        | 来源                  |
| ------------------------------- | ----------------------------- | ---------------------- | --------------------- |
| @nestjs/common / core / testing | 12.0.1                        | —                      | `pnpm view` dist-tags |
| @nestjs/cli                     | 12.0.0                        | —                      | `pnpm view` dist-tags |
| @nestjs/config                  | 12.0.0                        | `^11 \|\| ^12`         | registry              |
| @nestjs/swagger                 | 12.0.1                        | `^12.0.0`              | registry              |
| @mikro-orm/nestjs               | 7.0.3-dev.23（dist-tag next） | `^11.0.5 \|\| ^12.0.0` | registry              |
| @nestjs/throttler               | 6.5.0（不升）                 | `≤^11`，无 dev 标签    | registry              |
| nestjs-pino                     | 4.6.1（不升）                 | `≤^11`，无可用 dev     | registry              |

### 仓库现状关键点

- Vitest 约定：desktop 测试显式 `import { describe, it, expect, vi } from 'vitest'`；共享基座 [base.ts](../../../tooling/test/base.ts)（`globals: true`，desktop 在用），server 复用。
- jest 系依赖仅 apps/server 消费（全仓 package.json grep 实证），迁移后 catalog 可清理。
- oxlint 无 jest 专属配置；turbo `test` 任务名不变，turbo.json 零改动。
- v12 breaking changes 中与仓库无关项：无 class-validator（自研 ZodValidationPipe）、env 用 `validate` 函数（非 `validationSchema`）、日志走 nestjs-pino、未用 NATS/GraphQL、无 webpack。Node ≥ 24 满足 v12 要求。

## 总体回退策略

- 全程在 `feat/nest-12` 分支，`main` 不动。
- 阶段一（Task 1–5）完成即形成一个完整可合入的改动；阶段二（Task 6–10）任一步失败 → 停下汇报，由用户决定，不擅自回退或推进。

---

# 阶段一：Vitest 迁移（NestJS 11 上）

### Task 1: 分支

- [ ] **Step 1: 确认工作区干净并建分支**

```powershell
git status --short; git log --oneline -3
git checkout -b feat/nest-12
```

预期：工作区仅可能有未跟踪的计划文档；分支创建成功。

---

### Task 2: Vitest 基建

**Files:**

- Create: `apps/server/vitest.config.ts`
- Create: `apps/server/vitest.e2e.config.ts`
- Modify: `apps/server/package.json`（scripts、devDeps）
- Modify: `apps/server/tsconfig.json`（types、include）

说明：本任务**暂不删** jest / ts-jest / @types/jest 依赖，`@types/jest` 的全局类型先留着，避免 spec 未迁移期间 typecheck 全线报错；Task 5 统一清理。

- [ ] **Step 1: 新建 `apps/server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * server 单测配置：spec 与源码同目录（src/**/*.spec.ts），全 mock、不触外部服务。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    include: ['src/**/*.spec.ts'],
  },
})
```

- [ ] **Step 2: 新建 `apps/server/vitest.e2e.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { baseTestConfig } from "../../tooling/test/base.ts";

/**
 * e2e 配置：等价原 test/jest-e2e.json + --runInBand。
 * testTimeout 放宽到 30s：beforeAll 完整启动 Nest 应用，auth-me 真实登录用例走 Supabase 网络。
 * env 由脚本里的 dotenv-cli 注入 process.env（spec 直接读 process.env，与 jest 时期一致）。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    include: ["test/*.e2e-spec.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
```

- [ ] **Step 3: 改 `apps/server/package.json` scripts**

```json
"test": "vitest run",
"test:e2e": "dotenv -e ../../.env -e ../../.env.development -- vitest run --config vitest.e2e.config.ts",
```

- [ ] **Step 4: `apps/server/package.json` devDependencies 加 vitest**

```json
"vitest": "catalog:test",
```

（catalog 已有 `vitest: ^4.1.10`，无需动 pnpm-workspace.yaml。）

- [ ] **Step 5: 改 `apps/server/tsconfig.json`**

`types` 去掉 jest（spec 显式 import vitest API，不依赖全局类型）；include 收编两个新配置文件：

```json
"types": [
  "node"
],
"include": [
  "src/**/*.ts",
  "test/**/*.ts",
  "mikro-orm.config.ts",
  "vitest.config.ts",
  "vitest.e2e.config.ts"
],
```

- [ ] **Step 6: 安装**

```powershell
pnpm install
```

预期：成功，无新增 peer 警告。

---

### Task 3: 单测迁移（10 个 spec）

**Files:** `apps/server/src/**/*.spec.ts`（10 个文件）

- [ ] **Step 1: 按替换表逐文件迁移**

所有文件：顶部补 `import { describe, it, expect, ... } from 'vitest'`（按实际使用的函数增减），`jest.` 前缀换 `vi.`。逐文件清单：

| 文件                                  | 现有 jest API                                                         | 改动                                      |
| ------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| compression.middleware.spec.ts        | 仅 describe/it/expect 全局                                            | 只加 import                               |
| helmet.middleware.spec.ts             | 仅 describe/it/expect 全局                                            | 只加 import                               |
| zod-validation.pipe.spec.ts           | 仅 describe/it/expect 全局                                            | 只加 import                               |
| response-envelope.interceptor.spec.ts | jest.fn                                                               | vi.fn                                     |
| throttle.config.spec.ts               | jest.fn().mockReturnValue                                             | vi.fn().mockReturnValue                   |
| supabase-jwt.guard.spec.ts            | jest.fn / mockResolvedValue                                           | vi 系                                     |
| all-exceptions.filter.spec.ts         | jest.fn / mockReturnThis                                              | vi 系（vitest 支持 mockReturnThis，保留） |
| timeout.interceptor.spec.ts           | jest.fn + useFakeTimers/useRealTimers/advanceTimersByTime             | vi 系同名方法                             |
| jwt-verifier.service.spec.ts          | jest.mock/jest.mocked/SpyInstance/clearAllMocks/restoreAllMocks/spyOn | 见 Step 2                                 |
| health.service.spec.ts                | jest.mock(@mikro-orm/nestjs)/fake timers/spyOn(clearTimeout)          | 见 Step 3                                 |

API 对应关系：`jest.fn→vi.fn`、`jest.mocked→vi.mocked`、`jest.spyOn→vi.spyOn`、`jest.useFakeTimers/useRealTimers/advanceTimersByTime→vi.*`、`jest.clearAllMocks/restoreAllMocks→vi.*`、`jest.SpyInstance→import type { MockInstance } from 'vitest'`。`it.each`、`expect.anything/objectContaining/matchObject/rejects` 均为 vitest 原生支持，零改动。

- [ ] **Step 2: 迁移 jwt-verifier.service.spec.ts（最复杂，关键片段）**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import { JwtVerifierService } from "./jwt-verifier.service.ts";

// jose 是纯函数库，直接整体 mock：隔离网络（JWKS 拉取）与真实密码学运算。
// vi.mock 由 Vitest 提升到所有 import 之前，写在 import 后是官方惯用形态
vi.mock("jose", () => ({
  decodeProtectedHeader: vi.fn(),
  decodeJwt: vi.fn(),
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => Symbol("jwks")),
}));

const jose = {
  decodeProtectedHeader: vi.mocked(decodeProtectedHeader),
  decodeJwt: vi.mocked(decodeJwt),
  jwtVerify: vi.mocked(jwtVerify),
  createRemoteJWKSet: vi.mocked(createRemoteJWKSet),
};
```

`warnSpy` 类型改为 `let warnSpy: MockInstance`；`jest.clearAllMocks()` → `vi.clearAllMocks()`，`jest.restoreAllMocks()` → `vi.restoreAllMocks()`，fetch 的 `jest.spyOn` → `vi.spyOn`。文件其余断言（rejects.toThrow / toMatchObject / it.each）零改动。

- [ ] **Step 3: 迁移 health.service.spec.ts（ESM mock 示范文件）**

```ts
// vi.mock 由 Vitest 提升到 import 之前（与 jest.mock 语义一致， Vitest 原生可加载 ESM 包）
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MikroORM } from "@mikro-orm/core";
import { HealthService } from "./health.service.ts";

vi.mock("@mikro-orm/nestjs", () => ({
  InjectMikroORM: () => () => {},
}));
```

fake timers 与 `vi.spyOn(global, 'clearTimeout')` 同名替换。

- [ ] **Step 4: 先跑单文件冒烟，再跑全量**

```powershell
pnpm --filter server exec vitest run src/common/pipes
pnpm --filter server test
```

预期：10 个 spec 全绿。

- [ ] **Step 5: typecheck + lint**

```powershell
pnpm --filter server typecheck; pnpm --filter server lint
```

预期：双绿。

- [ ] **Step 6: 提交**

```powershell
git add -A
git commit -m "test(server): migrate unit specs from jest to vitest"
```

---

### Task 4: e2e 迁移 + DI 元数据验证

**Files:**

- Modify: `apps/server/test/health.e2e-spec.ts`
- Modify: `apps/server/test/auth-me.e2e-spec.ts`
- 条件新增: `.swcrc`、`unplugin-swc`/`@swc/core` 依赖（仅 spike 失败时）

- [ ] **Step 1: 两个 e2e spec 各加一行 import**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
```

其余零改动（`describe.skip`、supertest、`toMatchObject` 均原生支持）。

- [ ] **Step 2: 跑 e2e**

```powershell
pnpm --filter server test:e2e
```

- [ ] **Step 3: 按结果走分支**

- **PASS** → 阶段一最大风险排除，进 Task 5。
- **FAIL 且报错形如 `Nest can't resolve dependencies of ...`** → DI 元数据缺失，执行 Step 4（SWC 配方）。
- **其他报错** → 停止，记录原文，向用户汇报。

- [ ] **Step 4（条件）: 引入 SWC 转换**

```powershell
pnpm view unplugin-swc version; pnpm view @swc/core version
```

用实测版本在 `pnpm-workspace.yaml` 的 `test` catalog 加 `'@swc/core': <实测>` 与 `unplugin-swc: <实测>`；`apps/server` devDeps 加两项 `catalog:test` 引用并 `pnpm install`。

新建 `apps/server/.swcrc`：

```json
{
  "jsc": {
    "parser": { "syntax": "typescript", "decorators": true },
    "transform": { "legacyDecorator": true, "decoratorMetadata": true },
    "target": "es2022"
  }
}
```

`vitest.e2e.config.ts` 加插件（仅 e2e 需要，单测不动）：

```ts
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    /* 原内容不变 */
  },
});
```

重跑 Step 2，预期全绿。

- [ ] **Step 5: 提交**

```powershell
git add -A
git commit -m "test(server): migrate e2e specs to vitest"
```

---

### Task 5: jest 残留清理 + 规则/文档同步

**Files:**

- Modify: `apps/server/package.json`、`pnpm-workspace.yaml`、`apps/server/README.md`
- Modify: `.trae/rules/server/tests/commands.md`、`structure.md`、`mock.md`
- Modify: 根 `AGENTS.md`
- Delete: `apps/server/test/jest-e2e.json`

- [ ] **Step 1: server package.json 删 jest 系**

devDependencies 删 `jest`、`ts-jest`、`@types/jest` 三行；删底部整段 `"jest": {...}` 配置。

- [ ] **Step 2: 删 `apps/server/test/jest-e2e.json`**（已被 vitest.e2e.config.ts 取代）

- [ ] **Step 3: catalog 清理**

`pnpm-workspace.yaml` 的 `test` catalog 删 `jest`、`ts-jest`、`'@types/jest'` 三行（已实证仅 server 消费）。`pnpm install` 确认成功。

- [ ] **Step 4: 同步规则与文档（jest → vitest 表述）**

- `apps/server/README.md` 第 20–21 行：`jest` → `vitest`，描述改「vitest（src/\*_/_.spec.ts）」。
- `.trae/rules/server/tests/commands.md`：description 与要点 1 的 Jest/jest run → Vitest/vitest run；要点 3 不变；要点 7 「vitest.config and jest」→「vitest config」；示例 `--testPathPattern=health` → `pnpm --filter server exec vitest run src/modules/health`（vitest 按路径过滤）。
- `.trae/rules/server/tests/structure.md`：要点 3 配置位置改为 `apps/server/vitest.config.ts`（单测）+ `apps/server/vitest.e2e.config.ts`（e2e）；description 的 Jest → Vitest。
- `.trae/rules/server/tests/mock.md`：description 与正文的 `jest.mock` → `vi.mock`（Vitest 同样提升到 import 前，且原生可加载 ESM 包，要点 2 的「Jest CJS 无法 require」表述同步更新）；要点 3 计时器 API 换 `vi.*`；示例代码同步替换。
- 根 `AGENTS.md` Commands 表：desktop test 行的「tests live only in this app」已不成立，改为两行分别指向 `pnpm --filter desktop test` 与 `pnpm --filter server test`（均 vitest），注意该文件有 word budget（`scripts/doc-budgets.manifest.json`）。

- [ ] **Step 5: 阶段一全量验证**

```powershell
pnpm --filter server test; pnpm --filter server typecheck; pnpm --filter server lint; pnpm verify:docs
```

预期：全绿。

- [ ] **Step 6: 提交**

```powershell
git add -A
git commit -m "chore(server): drop jest stack and sync test rules/docs"
```

---

# 阶段二：NestJS 11 → 12

### Task 6: catalog 升级

**Files:**

- Modify: `pnpm-workspace.yaml`（`catalogs.backend` 段）

- [ ] **Step 1: 查两个未核实的 12 线版本号**

```powershell
pnpm view @nestjs/platform-express version; pnpm view @nestjs/schematics version
```

- [ ] **Step 2: 修改 catalog（保持其余条目不动）**

```yaml
"@nestjs/common": ^12.0.1
"@nestjs/core": ^12.0.1
"@nestjs/platform-express": ^12.0.1 # 用 Step 1 实测版本
"@nestjs/config": ^12.0.0
"@nestjs/cli": ^12.0.0
"@nestjs/schematics": ^12.0.0 # 用 Step 1 实测版本
"@nestjs/testing": ^12.0.1
"@nestjs/swagger": ^12.0.1
"@mikro-orm/nestjs": 7.0.3-dev.23 # dev 版精确 pin（semver 区间对 prerelease 不前移）；其余 @mikro-orm/* 保持 ^7.1.11
```

`@nestjs/throttler: ^6.5.0` 与 `nestjs-pino: ^4.6.1` 不动。

- [ ] **Step 3: 安装**

```powershell
pnpm install
```

预期：成功；出现 throttler / nestjs-pino 的 peer 不匹配**警告**（pnpm 默认 `strict-peer-dependencies=false`，仅警告）。若硬失败：记录报错原文，停止汇报。

- [ ] **Step 4: 确认安装结果**

```powershell
pnpm --filter server list @nestjs/common @nestjs/config @nestjs/swagger '@mikro-orm/nestjs' @nestjs/throttler nestjs-pino --depth 0
```

预期：@nestjs/\* 为 12.x、@mikro-orm/nestjs 为 7.0.3-dev.23、throttler 6.5.0、nestjs-pino 4.6.1。

- [ ] **Step 5: 提交**

```powershell
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "build(server): bump @nestjs/* to v12 and mikro-orm/nestjs dev adapter"
```

---

### Task 7: typecheck 适配

**Files:** 视 tsc 输出而定；已知候选 `apps/server/src/common/pipes/zod-validation.pipe.ts`

- [ ] **Step 1: 跑 typecheck**

```powershell
pnpm --filter server typecheck
```

- [ ] **Step 2: 按报错逐个修（编译器不报就不动）**

已知候选：v12 泛型化 `ArgumentMetadata`、细化 `PipeTransform.transform` 签名。当前实现（`transform(value: unknown, _metadata: ArgumentMetadata): unknown`）若报不兼容则对齐新签名，函数体不动。其余报错最小化修复，不顺手重构。

- [ ] **Step 3: 复跑确认绿，有改动则提交**

```powershell
pnpm --filter server typecheck
git add -A; git commit -m "fix(server): adapt to @nestjs v12 type changes"
```

---

### Task 8: 全量测试

- [ ] **Step 1: 单测 + e2e**

```powershell
pnpm --filter server test
pnpm --filter server test:e2e
```

预期：全绿。v12 生命周期钩子改为按组件层级逆序执行，若 teardown 类断言失败，按报错最小调整对应 spec 的顺序假设。

- [ ] **Step 2: 有改动则提交**

```powershell
git add -A; git commit -m "test(server): align specs with v12 lifecycle hook ordering"
```

---

### Task 9: 构建与运行时冒烟

- [ ] **Step 1: 生产构建**

```powershell
pnpm --filter server build
```

预期：`nest build`（CLI 12）产出 `dist/`。

- [ ] **Step 2: 启动 dev 服务**

```powershell
pnpm --filter server dev
```

等待 `Server running on http://localhost:4000`。

- [ ] **Step 3: 探针与文档（另开终端）**

```powershell
curl http://localhost:4000/api/v1/health/liveness      # 预期 {"data":{"status":"ok"}}
curl http://localhost:4000/api/v1/health/readiness     # 预期 {"data":{"status":"ok","db":"connected",...}}
curl -I http://localhost:4000/docs                     # 预期 HTTP 200（swagger 12）
```

readiness 通过即证明 `@mikro-orm/nestjs` 7.0.3-dev.23 运行时可用。

- [ ] **Step 4: 限流（验证 throttler 6.5.0 对 nest 12 的运行时兼容）**

```powershell
1..101 | ForEach-Object { curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:4000/api/v1/auth/me }
```

预期：前 100 次 401，第 101 次起 429。429 从未出现 → throttler 运行时不兼容，进 Step 6。

- [ ] **Step 5: 日志与停机**

观察 dev 终端：pino-pretty 输出正常、请求日志带 req.id、`/api/v1/health` 轮询不刷日志。Ctrl+C 观察 graceful shutdown 排水（v12 Express adapter 新能力，`enableShutdownHooks` 已开）。无异常 → 跳到 Task 10。

- [ ] **Step 6: 失败回退**

限流或日志冒烟失败 → 停止，向用户呈报：失败项、报错原文、选项（等 upstream 发版 / 临时替换实现 / 阶段二回退）。

---

### Task 10: 仓库级验证与收尾

- [ ] **Step 1: 全仓验证套件**

```powershell
pnpm test; pnpm typecheck; pnpm lint; pnpm verify:docs
```

预期全绿。

- [ ] **Step 2: Agent Note**

按 `.agents/notes/README.md` 契约新增：两阶段决策（为何先迁 Vitest）、放行 peer 的两个包及原因、DI 元数据的处理结果（SWC 用没用上）、遗留项（throttler / nestjs-pino / mikro-orm dev 转正后跟随升级）。

- [ ] **Step 3: 版本号表述核查**

```powershell
Get-ChildItem docs -Recurse -Filter *.md | Select-String -Pattern 'NestJS ?1[01]'
Select-String -Path apps/server/README.md -Pattern 'NestJS ?1[01]'
```

仅命中具体版本号表述时同步改为 12（预期零命中：架构文档只写 "NestJS" 不带版本）。

- [ ] **Step 4: 提交并汇报**

```powershell
git add -A
git commit -m "docs: add nestjs 12 upgrade note"
```

向用户汇报：改动清单、验证结果、遗留风险；**不合并、不 push**（等用户明确指示）。

---

## Self-Review 记录

- 覆盖面：Jest/ESM 风险（阶段一整体消除）、DI 元数据（Task 4 spike + SWC 配方）、catalog 升级（Task 6）、编译适配（Task 7）、单测/e2e（Task 8）、构建+运行时（Task 9）、仓库套件+规则文档+记忆（Task 5/10）。调研中每个风险点都有对应任务。
- 无占位符：所有命令、文件、代码、预期输出写实；三处版本号（platform-express / schematics / SWC 系）以执行时 `pnpm view` 实测填充，命令已给出。
- 决策点明确：Task 4 Step 3、Task 6 Step 3、Task 9 Step 6 各有判定与回退，不依赖执行者发挥。
