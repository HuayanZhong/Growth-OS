/**
 * 适配器插件契约（迭代计划 4.1）：插件 = 带元数据的适配器包。
 *
 * 设计立场（承 4.1 前置决策）：
 * - 不引入新容器——插件加载器复用宿主的注册机制（后端 Nest provider /
 *   前端 composable 工厂），PluginContext 是宿主能力的窄接口；
 * - 适配器契约（packages/types/src/adapters/）是唯一耦合点：插件实现契约，
 *   调用方消费契约，插件机制只负责装载与生命周期；
 * - 本模块只放类型；加载器（校验/装载/卸载）在 apps/server 侧实现（4.1 P1）。
 */

/** 可插件化的适配器种类。shell（桌面主进程 secureStore 等）不插件化 */
export type AdapterType = 'llm' | 'storage' | 'auth' | 'tool'

/** 插件声明的一个适配器实现 */
export interface AdapterRef {
  type: AdapterType
  /** 实现的契约接口名（packages/types/src/adapters/ 中的导出名，如 'LLMAdapter'） */
  interface: string
  /** 所实现契约的版本（semver major 需与宿主兼容） */
  version: string
}

/** 插件元数据：来源为插件包 package.json 的 `growthos` 字段 */
export interface PluginMetadata {
  /** 插件唯一 id（建议 npm 包名，如 'growthos-deepseek'） */
  id: string
  name: string
  /** 插件自身版本（semver） */
  version: string
  description?: string
  author?: string
  adapters: AdapterRef[]
}

/**
 * 插件装载上下文：宿主交给 activate 的能力面。
 * registerAdapter 的 impl 必须实现 type 对应的契约接口（加载器校验）。
 */
export interface PluginContext {
  /** 注册适配器实现；同 type 重复注册以最后一次为准 */
  registerAdapter(type: AdapterType, impl: unknown): void
  /** 读取其它插件注册的适配器（未注册返回 null） */
  getAdapter<T>(type: AdapterType): T | null
  /** 订阅宿主会话事件（词汇表见 events/session.ts）；返回取消订阅函数 */
  onEvent(
    type: import('./events/session.ts').SessionEventType,
    handler: (event: import('./events/session.ts').SessionEvent) => void,
  ): () => void
  /** 读取插件配置（宿主按插件 id 隔离的配置段；热更新见 4.2 P2） */
  getConfig<T>(key: string): T | undefined
}

/** 插件实例：加载器装入的入口单元 */
export interface Plugin {
  metadata: PluginMetadata
  /** 装载：注册适配器/初始化资源；抛错则装载失败（插件标记为 error） */
  activate(context: PluginContext): Promise<void>
  /** 卸载：撤销注册/释放资源；加载器保证 deactivate 后适配器不可达 */
  deactivate(): Promise<void>
}

/** 插件运行状态（加载器维护，诊断与 UI 展示用） */
export type PluginStatus = 'registered' | 'activating' | 'active' | 'deactivating' | 'error'

/** 加载器视角的插件记录：实例 + 状态 + 失败原因 */
export interface PluginRecord {
  plugin: Plugin
  status: PluginStatus
  /** status === 'error' 时的失败摘要 */
  error?: string
}
