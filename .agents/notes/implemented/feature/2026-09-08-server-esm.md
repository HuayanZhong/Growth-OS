# Agent Note: server 切换 ESM 输出

Status: implemented

## Problem

Nest 12 与 MikroORM v7 的包均为 ESM-only，server 以 CJS 产物经 Node require(esm) 桥接运行。桥接层依赖 Node ≥20.19/22.12 的 unflagged require(esm)，且是历史上 Jest 时期"E2E 无法加载 v7 ESM 包"问题的残留语境。

## Decision

- `apps/server/package.json` 加 `"type": "module"`——唯一改动。基座 `tooling/typescript/runtime/node.json` 已是 `module: NodeNext`（按 type 字段自动切换输出格式），源码相对 import 全部带 `.ts` 扩展（`rewriteRelativeImportExtensions` 编译重写为 `.js`），全仓无 `__dirname`/`require()`/`module.exports`，`@/` paths 别名零使用——代码侧无需任何改动。
- ESM 下 import CJS 依赖（helmet/compression 等）由 Node 原生 interop 处理，无需调整。

## Alternatives considered

- 保持 CJS + require(esm)：可行（官方明确允许），但与仓库其他包（Nuxt/desktop-core/shared/types 均为 ESM）形态不一致，且桥接语义在工具链升级时是隐性变量。

## Consequences

- 已验证：nest build 产物为 ESM（`import` + 相对 `.js` 重写）、mikro-orm CLI（debug 加载编译后 config、连库）、dev 全链路启动、单测 101、e2e 6（含真实 Supabase 登录，SWC 装饰器元数据在 ESM 加载器下正常）、全仓 lint/typecheck/hygiene/verify-docs。
- 新代码约束不变：相对 import 必须带扩展名、不得引入 CJS API（`require`/`__dirname`）——ESM 下会直接运行时报错。
- CI 的 build/e2e 步骤会在流水线上复验同一链路。
