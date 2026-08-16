# TypeScript 配置架构

## 设计原则

Growth OS 是 Monorepo，TypeScript 配置不围绕单一框架设计，采用分层：

> Language → Runtime → Preset → Project

每层只负责自己的职责，保证配置可维护、可扩展、支持多框架共存。

## 目录结构（现状）

配置位于 `tooling/typescript/`：

```text
tooling/typescript/
├── base.json
├── runtime/
│   ├── browser.json
│   └── node.json
└── framework/
    ├── vue.json
    ├── nuxt.json
    ├── react.json
    ├── next.json
    ├── nest.json
    ├── tauri.json
    ├── library.json
    └── test.json
```

---

## 第一层：base.json

仓库唯一的语言规范，只负责 TypeScript 自身：

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `resolveJsonModule`
- `verbatimModuleSyntax`
- `allowImportingTsExtensions`
- `forceConsistentCasingInFileNames`
- `skipLibCheck`

不感知 Browser / Node / 任何框架。

## 第二层：runtime/

运行环境层，解决"代码跑在哪个平台"。

- `runtime/node.json`：继承 base；`target: ES2024`、`module/moduleResolution: NodeNext`、`lib: [ES2024]`、`types: [node]`、`noEmit: true`。适用于 NestJS、CLI、Node 脚本。
- `runtime/browser.json`：继承 base；DOM 相关 lib 与 bundler 模块解析。适用于浏览器运行的前端。

## 第三层：framework/

框架/场景预设，继承 runtime 或 base，只增加框架自身需要的配置，不修改 runtime。

- `framework/nest.json`：继承 node；增加 `experimentalDecorators` + `emitDecoratorMetadata`（Decorator 元数据只 Nest 需要，不进 base）。
- `framework/vue.json`：继承 browser；Vue 相关类型与 JSX。
- `framework/nuxt.json` / `react.json` / `next.json` / `tauri.json`：按需扩展；Nuxt 自身生成 `.nuxt/tsconfig.json`，这里不重复维护。
- `framework/library.json`：继承 base；`declaration`、`declarationMap`、`composite`、`incremental`，适用于需要产出的库。
- `framework/test.json`：测试环境预设。

## 继承关系（实际）

```text
                    base
                 /      \
          browser        node
             │            │
            vue          nest
```

## 项目实际继承（现状）

| 项目                    | 继承                                   | 备注                                            |
| ----------------------- | -------------------------------------- | ----------------------------------------------- |
| `apps/server`           | `framework/nest.json`                  | + `declaration: true`（TsMorph 生产需要 .d.ts） |
| `packages/ui`           | `framework/vue.json`                   |                                                 |
| `packages/shared`       | `runtime/node.json`                    | 零依赖工具包，无产出要求                        |
| `packages/types`        | `runtime/node.json`                    |                                                 |
| `packages/desktop-core` | `runtime/node.json`                    |                                                 |
| `apps/desktop`          | Nuxt 自动生成（`.nuxt/tsconfig.json`） | 不继承分层预设                                  |

说明：`framework/` 下的 `nuxt` / `react` / `next` / `tauri` / `library` / `test` 预设已就位但当前无消费方，供后续项目按需接入；新增消费方时在对应 `tsconfig.json` 中 `extends` 即可。

## 为什么这样设计？

传统单 tsconfig 随项目扩大（Web / Server / Package / 多框架）会堆到 200+ 行、没人敢改。分层后：

- 配置职责单一
- 易于维护与扩展
- 支持多框架共存、Monorepo、未来微前端演进

改动注意：配置树移动时同步更新本文档（见 [tooling/AGENTS.md](../../tooling/AGENTS.md)）。
