# Agent Note: 扩展物料的三层模型与远程 UI 加载（MF）选型

Status: proposed

## Problem

用户看到飞书多维表格插件以 Module Federation（下称 MF）实现的介绍，提出：我们的 MCP、skills 这类资源是否也能做成"远程物料"。当前技能体系是静态占位（`apps/desktop/app/utils/skills.ts` 的 `SKILL_LIST`，注释预留"技能体系落地后迁移 types/server 接口"），`ExtensionPickerModal` 也预留了"插件/MCP 后续接入同一弹窗"。需要先厘清"物料"指什么、MF 适用于哪一层，再决定技能体系的演进方向，避免把前端模块加载机制错用到能力层。

## Decision/Proposal

**扩展物料按三层拆分，每层各有自己的远程化机制，MF 只覆盖 UI 层且当前不实施：**

| 物料层 | 例子 | 本质 | 远程化机制 |
| --- | --- | --- | --- |
| 能力物料 | 联网搜索、代码运行、知识库检索 | Agent 运行时调用的后端工具 | **MCP**（含 remote MCP server）；服务端适配器插件化见 [2026-09-07-plugin-interface.md](../feature/2026-09-07-plugin-interface.md)（另一条轴：后端适配器，非前端物料） |
| UI 物料 | 技能配置面板、插件小部件、第三方卡片 | 前端模块 | MF / iframe 沙箱 / Web Components——飞书多维表格插件属于此类 |
| 定义物料 | Agent 模板、工作流、Prompt 包 | JSON/配置数据 | 注册中心 API + 拉取，与模块加载无关 |

**结论**：MCP/skills 的能力部分可以远程物料化，但载体是 MCP 协议而非 MF；MF 的用武之地仅限 UI 物料层。技能体系落地时按"**技能 = 能力（MCP 工具）+ 可选 UI 模块**"建模，保住这条边界，远程 UI 方案可以后补。

**桌面端约束（实施 UI 物料时必须面对）**：

1. **安全面**：MF 远程模块与宿主同特权运行于 Electron renderer（能触及 `window.desktop` 的 IPC 面，含 secureStore）；iframe/webview 有沙箱隔离。飞书/Coze 类产品给第三方插件 UI 用 iframe 沙箱而非同特权模块，原因即此。
2. **离线**：远程物料按 URL 实时加载，桌面端离线时全部失效，需要本地缓存/降级策略（字体"本地打包、可离线"规则同源）。

**触发条件**：近期按官方内置技能推进（能力层走 MCP）。当出现"团队内多仓库独立发布技能 UI"或"第三方插件生态入驻"需求时，再评估 MF vs iframe 沙箱（第三方场景优先倾向 iframe 沙箱）。

## Alternatives considered

- **MF 全面物料化（含 MCP/skills 能力）**：否决。能力物料是后端工具调用，不是前端代码，MF 的模块加载机制管不到；定义物料是数据，走注册中心 API 即可。MF 只解决"远程前端模块运行时组装"这一个问题。
- **iframe/webview 沙箱作为 UI 物料机制**：保留为候选，且对第三方场景优先级高于 MF（沙箱隔离、权限面可控）；代价是与宿主的通信带宽受限于 postMessage/bridge，官方内置物料不需要这层隔离，直接同包构建即可。
- **不做边界设计、等需求出现再说**：否决。若技能体系落地时把能力与 UI 焊死在一个概念里（技能 id 直接绑前端组件），后续引入远程 UI 物料时需重构目录模型；边界在建模期保住成本近零。

## Consequences

- 技能目录的数据模型（迁移 types/server 时）按"能力 + 可选 UI 模块"两面建模，UI 面允许为空；`ExtensionPickerModal` 的"插件/MCP 后续接入"按此模型扩展左侧分类。
- 本提案不引入任何实现变更；MF 相关代码零落地，无构建配置影响。
- 出现独立发布/生态需求时，重新开 note 评估 MF vs iframe 沙箱，届时需一并设计：远程代码权限模型（IPC 白名单）、离线缓存策略、物料版本与签名。
