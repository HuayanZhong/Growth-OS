# Agent Note: 适配器插件接口与加载器（阶段四 4.1）

Status: proposed

## Problem

阶段二定稿了四个适配器契约（llm/storage/auth/shell），但它们目前只能是"编译期可替换"——换实现要改代码重新构建。阶段四目标是适配器可运行时装载：第三方以 npm 包形态分发适配器（package.json `growthos` 字段），宿主校验元数据、装载、生命周期管理。需要先定稿插件契约与加载器行为，再实现。

## Proposal

- **契约已定稿**（`packages/types/src/plugin.ts`，本变更随附）：`PluginMetadata`（package.json `growthos` 字段的结构）/ `AdapterRef` / `Plugin`（activate/deactivate）/ `PluginContext`（registerAdapter/getAdapter/onEvent/getConfig）/ `PluginRecord`（加载器诊断面，status + error）。
- 对计划 4.1 草稿的三处修正：
  1. `AdapterType` 收窄为 `llm | storage | auth | tool`，**shell 不插件化**（桌面主进程 secureStore 等安全敏感面，保持内置）；
  2. 计划草稿的 `context.on(event: string, ...)` 改为 `onEvent(type: SessionEventType, ...)`——复用会话事件词汇表约束，不给插件弱类型事件面；
  3. 新增 `PluginRecord`/`PluginStatus`（registered/activating/active/deactivating/error）：插件激活失败标记为 error 而非拖垮宿主启动。
- **加载器实现**（4.1 P1，待本提案批准）：落点 `apps/server/src/infra/plugins/`，职责——扫描插件包 `growthos` 字段、校验 `AdapterRef.interface` 与契约版本 major、提供 `PluginContext` 实现（桥接 Nest 容器与会话事件总线）、维护 `PluginRecord`。auth 类适配器需宿主配置白名单显式启用（认证是安全边界）。
- `tool` 适配器契约尚未定义（Skill 域目前只是目录）：`AdapterType` 保留 `tool` 占位，契约待工具执行管线定型后补。

## Alternatives considered

- **Cordis 插件框架**（2.2 备注中预留的选项）：作用域隔离、标准化生命周期、跨插件事件都很成熟，但引入新容器与自身生命周期模型，与"复用现有机制、不另起炉灶"的总体策略冲突；若插件生态长大到需要跨插件组合，再评估迁移。
- **允许插件注册任意 Nest provider**（不限于适配器）：扩展面最大，但插件将与宿主内部结构耦合，安全边界（auth）无法收敛；v1 限定适配器接口面。
- **激活失败静默跳过**：插件不可见，诊断困难；error 状态 + 摘要在加载器诊断面上可见。

## Consequences

- 提案批准后进入 4.1 P1（加载器实现）；4.2 生命周期扩展（install/mount/running）与 npm 分发格式在本契约上叠加。
- 首个插件化迁移对象是 LLM 适配器，但 **LLM 适配器本身尚无实现**（2.1 只有契约）——建议加载器动工前/并行按 cookbook（`infra/adapters/llm/` + DI token）落第一个 LLM 实现（如 DeepSeek 兼容），让插件化有真实迁移对象，避免对着空气设计。
- 前端侧（composable 注入适配器）不在 v1 加载器范围：桌面渲染进程的适配器目前全部内置（auth/shell），无热插拔诉求。
