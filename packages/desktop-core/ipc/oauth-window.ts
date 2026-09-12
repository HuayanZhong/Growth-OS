/**
 * oauthWindow IPC handler：OAuth 授权窗口（第三方登录）。
 *
 * 职责：创建次级 BrowserWindow 加载授权页，监听导航——
 * - 命中 `callbackOrigin`（origin + path 精确匹配）→ 拦截重定向、关窗、resolve 完整回调 URL
 * - 导航到白名单外 host → 中止并 reject
 * - 用户关闭窗口 / 超时 → reject
 *
 * 安全基线：sandbox / contextIsolation 开启、nodeIntegration 关闭、不挂 preload
 * （纯远程授权页）；拒绝 webview 嵌入；回调 URL 只经 invoke 响应返回，不落日志。
 *
 * 错误语义：以 reject 传递，message 为机器可读码（契约单源 @growth-os/types），
 * 渲染进程按码映射中文提示（Electron invoke 的 reject 只保留 message）。
 */
import { BrowserWindow } from 'electron'
import {
  OAUTH_WINDOW_BUSY,
  OAUTH_WINDOW_CANCELLED,
  OAUTH_WINDOW_INVALID_REQUEST,
  OAUTH_WINDOW_NAVIGATION_DENIED,
  OAUTH_WINDOW_TIMEOUT,
} from '@growth-os/types'
import type { IpcRequest, IpcResponse, OAuthWindowErrorCode } from '@growth-os/types'

// 错误码契约单源在 @growth-os/types，常量此处转导出（主进程内使用 + 测试引用）
export {
  OAUTH_WINDOW_BUSY,
  OAUTH_WINDOW_CANCELLED,
  OAUTH_WINDOW_INVALID_REQUEST,
  OAUTH_WINDOW_NAVIGATION_DENIED,
  OAUTH_WINDOW_TIMEOUT,
}

/** 授权窗口超时时长：用户可能在 GitHub 输入账号密码，给足时间 */
const OAUTH_WINDOW_TIMEOUT_MS = 5 * 60 * 1000

function oauthWindowError(code: OAuthWindowErrorCode): Error {
  return new Error(code)
}

/** URL 是否命中回调地址（origin 相同且 path 精确相等，query 不参与匹配） */
function matchesCallback(candidate: string, callbackOrigin: string): boolean {
  try {
    const url = new URL(candidate)
    const cb = new URL(callbackOrigin)
    return url.origin === cb.origin && url.pathname === cb.pathname
  } catch {
    return false
  }
}

function safeHost(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).host
  } catch {
    return null
  }
}

/** 授权页不允许嵌入 webview（防御性：缩小远程内容攻击面）。不捕获外部状态，放模块级 */
function denyWebviewAttach(event: Electron.Event): void {
  event.preventDefault()
}

// 模块级单飞守卫：同一时刻只允许一个授权窗口（双击/并发触发直接拒绝）
let activeWindow: BrowserWindow | null = null

/**
 * oauthWindow 通道 handler。窗口未关闭前重复调用以 OAUTH_WINDOW_BUSY 拒绝。
 */
export async function oauthWindowHandler(
  request: IpcRequest<'oauthWindow'>,
): Promise<IpcResponse<'oauthWindow'>> {
  if (activeWindow) {
    throw oauthWindowError(OAUTH_WINDOW_BUSY)
  }

  const authHost = safeHost(request.authUrl)
  const callbackHost = safeHost(request.callbackOrigin)
  if (!authHost || !callbackHost) {
    throw oauthWindowError(OAUTH_WINDOW_INVALID_REQUEST)
  }
  // 放行集合：authUrl 与回调 host 恒放行 + 渲染层声明的授权域白名单（如 github.com）
  const allowedHosts = new Set([authHost, callbackHost, ...request.allowedHosts])

  return new Promise<IpcResponse<'oauthWindow'>>((resolve, reject) => {
    const win = new BrowserWindow({
      width: 480,
      height: 680,
      title: '第三方登录',
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
      },
    })
    activeWindow = win

    let settled = false
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined

    const cleanup = () => {
      // timeoutTimer 在 settle 前必然已设置（无 null 分支）；窗口销毁后不访问 webContents
      clearTimeout(timeoutTimer)
      timeoutTimer = undefined
      if (!win.isDestroyed()) {
        win.webContents.removeListener('will-navigate', onNavigate)
        win.webContents.removeListener('will-redirect', onRedirect)
        win.webContents.removeListener('will-attach-webview', denyWebviewAttach)
        win.removeListener('closed', onClosed)
      }
      activeWindow = null
    }

    const settle = (outcome: () => void) => {
      /* v8 ignore next -- 双结算防御：cleanup 已移除全部监听，正常流不可重入 */
      if (settled) return
      settled = true
      cleanup()
      outcome()
      // 关窗放在 settle 内：resolve/reject 后再关，避免 'closed' 事件与清理竞态
      if (!win.isDestroyed()) {
        win.close()
      }
    }

    const resolveWith = (callbackUrl: string) => {
      settle(() => resolve({ callbackUrl }))
    }

    const rejectWith = (code: OAuthWindowErrorCode) => {
      settle(() => reject(oauthWindowError(code)))
    }

    // 命中回调 → 成功；白名单外 host → 异常中止；其余（授权域内）放行
    function onNavigate(event: Electron.Event, url: string): void {
      handleNavigation(event, url)
    }

    function onRedirect(event: Electron.Event, url: string): void {
      handleNavigation(event, url)
    }

    function handleNavigation(event: Electron.Event, url: string): void {
      if (matchesCallback(url, request.callbackOrigin)) {
        event.preventDefault()
        resolveWith(url)
        return
      }
      const host = safeHost(url)
      if (host === null || !allowedHosts.has(host)) {
        event.preventDefault()
        rejectWith(OAUTH_WINDOW_NAVIGATION_DENIED)
      }
    }

    function onClosed(): void {
      // 用户/系统直接关窗：窗口级 'closed' 事件。settle 已触发时此回调已被移除，
      // 走到这里说明流程未结束（用户中途关窗）。单飞设计下 activeWindow 必为 win 或 null。
      activeWindow = null
      rejectWith(OAUTH_WINDOW_CANCELLED)
    }

    win.webContents.on('will-navigate', onNavigate)
    win.webContents.on('will-redirect', onRedirect)
    win.webContents.on('will-attach-webview', denyWebviewAttach)
    win.on('closed', onClosed)

    timeoutTimer = setTimeout(() => {
      rejectWith(OAUTH_WINDOW_TIMEOUT)
    }, OAUTH_WINDOW_TIMEOUT_MS)

    win.loadURL(request.authUrl).catch(() => {
      rejectWith(OAUTH_WINDOW_NAVIGATION_DENIED)
    })
  })
}
