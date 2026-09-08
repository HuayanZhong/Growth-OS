# Agent Note (proposed): server 构建器演进路径（tsc → SWC，不用 rspack）

Status: proposed

## 现状与基线（2026-09-08）

- builder：tsc（nest-cli.json 未配置 builder，默认），全量 `nest build` 4.2s，src 57 个 .ts 文件。
- tsc 是"编译 + 类型检查 + declaration 产出"三合一；TsMorphMetadataProvider 运行时依赖 dist 同目录 `.d.ts` 推断实体类型。

## 触发条件（判断，非事实）

满足任一条时重新评估切 SWC builder：

- src .ts 文件数 > ~300，或全量 build > 15s；
- dev watch 单文件增量编译 > 3s（当前约 1s 内）；
- 出现第二个 Nest 应用需要同构并行构建。

## 届时的切换路径

1. `nest build -b swc`（或 nest-cli.json `"compilerOptions"` 加 builder 配置），依赖 `@swc/cli` + `@swc/core`；
2. 必须加 `--emit-declarations`（Nest 12 新增，SWC builder 不产声明文件——TsMorph 依赖它，这是本仓的硬要求）；
3. 类型检查彻底脱离编译：确认 `pnpm typecheck`（tsc --noEmit）在 CI 必跑（现已存在）；
4. 回归验证：mikro-orm CLI（entities glob / migrations path 依赖 dist 目录结构）、`mikro-orm:debug` 连库、dev 冒烟、e2e（SWC 装饰器元数据）、全仓五项检查。

## 为什么排除 rspack（以及 webpack）

rspack/webpack 是打包器（bundle 产物），与后端三个文件路径约定硬冲突：

- `entities: ['dist/**/*.entity.js']` 按文件 glob 找实体；
- `migrations.path: 'dist/infra/database/migrations'` 按目录加载迁移；
- TsMorph 依赖 dist 内逐文件的同目录 `.d.ts`。

要兼容就得定制配置取消打包，等于花成本换编译器再拆回逐文件形态。rspack 的收益区是大体量多应用并行构建，本仓单 server、4.2s 全量构建，不适用。
