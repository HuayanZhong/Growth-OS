/**
 * IPC 通道类型映射 —— Electron 主进程与渲染进程共享的类型契约。
 * 由 `@growth-os/types` 统一分发，跨包只读引用。
 *
 * 设计要点：
 * - key = 通道名（与 `ipcMain.handle` / `ipcRenderer.invoke` 第一参数一致）
 * - value = `{ request, response }`，分别对应请求参数与返回值类型
 * - `main.ts` 的 `handleIpc` 与 `preload.ts` 的 `invokeIpc` 均基于此映射派生签名
 * - `DesktopAPI` 也由此映射派生，确保 `window.desktop` 与底层通道一致
 *
 * 新增 IPC 通道时只需在此添加一行，三端类型自动同步。
 */

/**
 * 应用更新检查结果。
 *
 * 由 `autoUpdater.checkForUpdates()` 的返回值简化而来，
 * 去掉对渲染进程无意义的内部字段（如 updateInfo 对象、CancellationToken 等）。
 */
export interface UpdateCheckResult {
  /** 是否有可用更新 */
  available: boolean
  /** 最新版本号（无更新时为 null） */
  version: string | null
  /** 发布说明（无更新或非字符串时为 null） */
  releaseNotes: string | null
  /** 是否已下载完毕，可调用 quitAndInstall 安装 */
  downloaded: boolean
}

/**
 * IPC 通道映射表。
 * 每个条目描述一个 `ipcMain.handle` / `ipcRenderer.invoke` 通道的请求与响应类型。
 *
 * key 同时作为 IPC 通道名（传给 `ipcMain.handle` / `ipcRenderer.invoke`）和
 * 暴露给 `window.desktop` 的方法名。这样三端（main / preload / types）共享同一份契约，
 * 新增/重命名通道时编译期即可发现遗漏。
 *
 * 命名约定：使用驼峰式（如 `checkForUpdates`），便于渲染进程点号访问 `window.desktop.checkForUpdates()`。
 */
export interface IpcChannelMap {
  /** 获取 Electron 应用版本号 */
  version: {
    request: void
    response: string
  }
  /** 检查应用更新（手动入口）。返回当前更新状态，不阻塞下载流程。 */
  checkForUpdates: {
    request: void
    response: UpdateCheckResult
  }
  /** 退出应用并安装已下载的更新。若未下载完毕则无操作。 */
  quitAndInstall: {
    request: void
    response: void
  }
  /**
   * 安全存储（仅 Electron 环境）：主进程用 safeStorage（OS 级加密，
   * Win=DPAPI / macOS=Keychain / Linux=libsecret）加密后落盘 userData/secure-store。
   * 用于持久化 Supabase session 等敏感数据，localStorage 不再存 token。
   */
  secureStore: {
    request: {
      action: 'get' | 'set' | 'remove'
      /** 存储键（如 Supabase 的 session storageKey） */
      key: string
      /** 待加密写入的值（action 为 'set' 时必填） */
      value?: string
    }
    response: string | null
  }
  /**
   * 启动环境注入（迭代计划 2.4）：主进程把启动时可用的 NUXT_PUBLIC_* 白名单
   * 交给渲染层，插件在应用装配前合并进 runtimeConfig——桌面端"启动时可覆盖"
   * 配置，构建产物不再内联最终值。白名单仅含公开变量（non-secret）。
   */
  launchEnv: {
    request: void
    response: LaunchEnv
  }
  /**
   * OAuth 授权窗口（第三方登录，如 GitHub）：主进程创建次级 BrowserWindow 加载
   * 授权页，监听导航并在命中 `callbackOrigin` 前缀时拦截重定向、关闭窗口，
   * 把完整回调 URL 作为响应返回（渲染进程用它完成 Supabase 会话交换）。
   * 用户关闭窗口 / 超时 / 导航离开白名单域时以错误 reject（错误语义走 invoke 失败）。
   */
  oauthWindow: {
    request: {
      /** 授权页 URL（如 supabase-js signInWithOAuth 返回的 data.url） */
      authUrl: string
      /** 回调地址前缀（origin + path，如 `https://example.com/auth`），命中即视为流程结束 */
      callbackOrigin: string
      /**
       * 授权流程允许导航的额外 host 白名单（如 GitHub 授权页 github.com）。
       * authUrl 与 callbackOrigin 的 host 始终放行；导航到白名单外 host 视为异常并中止。
       */
      allowedHosts: string[]
    }
    response: {
      /** 命中回调时被拦截的完整回调 URL（query 含 OAuth code） */
      callbackUrl: string
    }
  }
}

/**
 * oauthWindow 通道错误码：主进程以 `Error(message = 错误码)` reject，
 * Electron invoke 序列化后仅保留 message，渲染进程按码映射中文提示。
 */
export const OAUTH_WINDOW_CANCELLED = 'oauth_window_cancelled'
export const OAUTH_WINDOW_TIMEOUT = 'oauth_window_timeout'
export const OAUTH_WINDOW_NAVIGATION_DENIED = 'oauth_window_navigation_denied'
export const OAUTH_WINDOW_BUSY = 'oauth_window_busy'
export const OAUTH_WINDOW_INVALID_REQUEST = 'oauth_window_invalid_request'

export type OAuthWindowErrorCode =
  | typeof OAUTH_WINDOW_CANCELLED
  | typeof OAUTH_WINDOW_TIMEOUT
  | typeof OAUTH_WINDOW_NAVIGATION_DENIED
  | typeof OAUTH_WINDOW_BUSY
  | typeof OAUTH_WINDOW_INVALID_REQUEST

/**
 * 启动时允许注入的公开配置键白名单。
 * 只收 NUXT_PUBLIC_*（设计上可暴露给前端）；secret 一律不进此通道。
 */
export type LaunchEnvKey =
  | 'NUXT_PUBLIC_SUPABASE_URL'
  | 'NUXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'NUXT_PUBLIC_API_BASE_URL'
  | 'NUXT_PUBLIC_APP_NAME'
  | 'NUXT_PUBLIC_SITE_URL'

/** 启动环境注入载荷：仅包含主进程环境中实际存在的键 */
export type LaunchEnv = Partial<Record<LaunchEnvKey, string>>

/** 所有 IPC 通道名（字符串字面量联合类型） */
export type IpcChannelName = keyof IpcChannelMap

/** 指定通道的请求参数类型 */
export type IpcRequest<TChannel extends IpcChannelName> = IpcChannelMap[TChannel]['request']

/** 指定通道的响应类型 */
export type IpcResponse<TChannel extends IpcChannelName> = IpcChannelMap[TChannel]['response']

/**
 * 从 `IpcChannelMap` 派生的桌面端 API 类型，对应 `window.desktop`。
 *
 * - `request: void` → 无参函数 `() => Promise<response>`
 * - 否则 → 单参函数 `(request) => Promise<response>`
 *
 * `preload.ts` 中的 `contextBridge.exposeInMainWorld('desktop', api)` 应符合此类型，
 * 任何通道签名变更都会在编译期同步暴露给渲染进程。
 */
export type DesktopAPI = {
  [K in IpcChannelName]: IpcRequest<K> extends void
    ? () => Promise<IpcResponse<K>>
    : (request: IpcRequest<K>) => Promise<IpcResponse<K>>
}
