# TypeScript 配置架构设计

## 设计目标

Growth OS 是一个 Monorepo 项目，未来将支持：

- Nuxt
- Vue
- React
- Next.js
- NestJS
- Tauri
- 多个 Packages
- 微前端

因此 TypeScript 配置不能围绕某一个框架设计，而应该采用分层设计。

整个设计遵循：

> Language → Runtime → Preset → Project

这样可以最大程度保证配置的可维护性与可扩展性。

---

# 目录结构

```text
configs/
└── typescript/
    ├── base.json
    │
    ├── runtime/
    │   ├── browser.json
    │   └── node.json
    │
    └── presets/
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

# 第一层：Base

```
base.json
```

Base 是整个仓库唯一的语言规范。

它只负责 TypeScript 自身。

例如：

- strict
- noUncheckedIndexedAccess
- exactOptionalPropertyTypes
- noImplicitReturns
- noImplicitOverride
- skipLibCheck
- forceConsistentCasingInFileNames

Base 永远不应该知道：

- Browser
- Node
- Vue
- React
- Nuxt
- Nest

更不能知道：

- DOM
- JSX
- Decorator
- Node Types

它只负责语言规则。

职责：

```
TypeScript Language Rules
```

---

# 第二层：Runtime

Runtime 表示运行环境。

目前主要分为：

```
runtime/

browser.json

node.json
```

它们解决的是：

> 当前代码运行在哪个平台。

而不是：

> 当前代码属于哪个框架。

---

## browser.json

适用于：

- Vue
- Nuxt
- React
- Next
- Tauri Frontend

主要负责：

- DOM
- DOM.Iterable
- Browser API
- Bundler Module Resolution

职责：

```
Browser Runtime
```

---

## node.json

适用于：

- NestJS
- CLI
- Node Scripts
- Build Tools

主要负责：

- Node Types
- Node Module Resolution
- Node Runtime

职责：

```
Node Runtime
```

---

# 第三层：Preset

Preset 表示：

> 针对不同框架或不同场景的配置预设。

Preset 不应该修改 Runtime。

它只增加：

框架自身需要的配置。

---

## vue.json

继承：

```
browser
```

增加：

- Vue JSX
- Vue Types

适用于：

- Vue 项目
- Vue Packages

---

## nuxt.json

继承：

```
vue
```

增加：

Nuxt 所需要的类型。

例如：

- Nuxt Runtime
- Auto Import

注意：

Nuxt 自身会生成：

```
.nuxt/tsconfig.json
```

这里不要重复维护。

---

## react.json

继承：

```
browser
```

增加：

```
jsx: react-jsx
```

适用于：

- React
- React Packages

---

## next.json

继承：

```
react
```

Next 自身会维护大量配置。

这里只作为统一入口。

---

## nest.json

继承：

```
node
```

增加：

```
experimentalDecorators

emitDecoratorMetadata
```

Decorator Metadata 不应该放到 Base。

只有 Nest 需要。

---

## tauri.json

继承：

```
browser
```

Tauri 前端本质仍然运行在 WebView。

因此：

它属于 Browser Runtime。

Rust 不属于 TypeScript 配置管理范围。

---

## library.json

Library 是整个 Monorepo 最重要的配置之一。

适用于：

```
packages/
```

例如：

- ui
- sdk
- shared

主要负责：

- declaration
- declarationMap
- composite
- incremental

Library 不依赖任何框架。

---

## test.json

适用于：

- Vitest
- Jest
- Playwright

增加：

```
vitest/globals

node
```

测试环境不应该污染业务代码。

---

# 配置继承关系

```text
                    base
                 /        \
          browser         node
             │              │
      ┌──────┴──────┐       │
      │             │       │
     vue         react     nest
      │             │
     nuxt         next

base
 ├── library
 └── test
```

---

# 项目如何继承

## Web

```
apps/web
```

继承：

```
presets/nuxt.json
```

---

## Server

```
apps/server
```

继承：

```
presets/nest.json
```

---

## Desktop

```
apps/desktop
```

继承：

```
presets/tauri.json
```

---

## UI

```
packages/ui
```

继承：

```
presets/vue.json
```

---

## SDK

```
packages/sdk
```

继承：

```
presets/library.json
```

---

## Shared

```
packages/shared
```

继承：

```
presets/library.json
```

---

# 为什么这样设计？

传统项目通常只有一个 tsconfig。

例如：

```
tsconfig.json
```

随着项目不断扩大：

- Web
- Server
- Package
- React
- Vue

所有配置都会堆积到同一个文件中。

最终变成：

```
200+
行配置
```

几乎没人敢修改。

---

采用分层设计以后：

Language

↓

Runtime

↓

Preset

↓

Project

每一层只负责自己的职责。

优点：

- 配置职责单一
- 易于维护
- 易于扩展
- 支持多框架共存
- 支持 Monorepo
- 支持未来微前端演进

这也是大型 Monorepo 中较为推荐的 TypeScript 配置组织方式。
