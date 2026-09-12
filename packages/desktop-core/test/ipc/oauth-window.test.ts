/**
 * oauthWindow IPC handler 单测（test/ipc/x.test.ts 对应 ipc/x.ts）。
 *
 * mock 策略：electron 模块整体 mock，BrowserWindow 用可编程 fake 替代——
 * 记录构造参数与事件监听，测试直接 emit webContents/window 事件模拟导航与关窗，
 * 不启动真实窗口。定时器用 vi.useFakeTimers 驱动超时路径。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IpcRequest } from '@growth-os/types'
import {
  OAUTH_WINDOW_BUSY,
  OAUTH_WINDOW_CANCELLED,
  OAUTH_WINDOW_INVALID_REQUEST,
  OAUTH_WINDOW_NAVIGATION_DENIED,
  OAUTH_WINDOW_TIMEOUT,
  oauthWindowHandler,
} from '../../ipc/oauth-window.ts'

/**
 * fake 三件套放在 vi.hoisted 内：vi.mock 工厂会被提升到文件顶部，
 * 直接引用文件内 class 会触发 TDZ（Cannot access before initialization）。
 */
const { FakeBrowserWindow, failNextLoadRef } = vi.hoisted(() => {
  /** webContents fake：记录监听并支持测试内手动 emit */
  type Listener = (event: Electron.Event, url?: string) => void

  class FakeWebContents {
    private listeners = new Map<string, Listener>()

    on = vi.fn((channel: string, cb: Listener) => {
      this.listeners.set(channel, cb)
    })
    removeListener = vi.fn((channel: string, cb: Listener) => {
      if (this.listeners.get(channel) === cb) this.listeners.delete(channel)
    })

    emit(channel: string, ...args: [event: Electron.Event, url?: string]): void {
      this.listeners.get(channel)?.(...args)
    }
  }

  /** BrowserWindow fake：记录构造参数，支持 emit 'closed'（命名避开外层解构变量，防 shadow） */
  class FakeBrowserWindowImpl {
    static instances: FakeBrowserWindowImpl[] = []

    webContents = new FakeWebContents()
    loadURL = vi.fn(() =>
      failNextLoadRef.value
        ? Promise.reject(new Error('ERR_INTERNET_DISCONNECTED'))
        : Promise.resolve(),
    )
    close = vi.fn()
    isDestroyed = vi.fn(() => false)
    private windowListeners = new Map<string, () => void>()

    constructor(public options?: Record<string, unknown>) {
      FakeBrowserWindowImpl.instances.push(this)
    }

    on = vi.fn((channel: string, cb: () => void) => {
      this.windowListeners.set(channel, cb)
    })
    removeListener = vi.fn((channel: string, cb: () => void) => {
      if (this.windowListeners.get(channel) === cb) this.windowListeners.delete(channel)
    })

    emitClosed(): void {
      this.windowListeners.get('closed')?.()
    }
  }

  return { FakeBrowserWindow: FakeBrowserWindowImpl, failNextLoadRef: { value: false } }
})

/** 置 true 后 handler 的 loadURL 直接 reject（模拟网络异常/页面加载失败） */
const failNextLoad = failNextLoadRef

vi.mock('electron', () => ({ BrowserWindow: FakeBrowserWindow }))

const AUTH_URL = 'https://ref.supabase.co/auth/v1/authorize?provider=github'
const CALLBACK_ORIGIN = 'http://localhost:3000/auth'

function req(overrides?: Partial<IpcRequest<'oauthWindow'>>): IpcRequest<'oauthWindow'> {
  return {
    authUrl: AUTH_URL,
    callbackOrigin: CALLBACK_ORIGIN,
    allowedHosts: ['github.com'],
    ...overrides,
  }
}

/** 可控的 handler 调用：outcome 记录 resolve/reject 结果（reject 记录 message 码） */
function call(request: IpcRequest<'oauthWindow'>) {
  const outcome = vi.fn()
  const promise = oauthWindowHandler(request).then(
    (value) => outcome('resolved', value),
    (err: Error) => outcome('rejected', err.message),
  )
  return { outcome, promise }
}

/** 冲刷微任务队列：等一个宏任务，期间所有已排队微任务（settle 的 then 链）执行完 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

function makeEvent() {
  return { preventDefault: vi.fn() } as unknown as Electron.Event
}

function lastWindow(): InstanceType<typeof FakeBrowserWindow> {
  const win = FakeBrowserWindow.instances.at(-1)
  if (!win) throw new Error('BrowserWindow 未创建')
  return win
}

beforeEach(() => {
  FakeBrowserWindow.instances = []
  failNextLoad.value = false
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('oauthWindowHandler', () => {
  it('will-navigate 命中回调地址：拦截、resolve 完整回调 URL 并关窗', async () => {
    const { outcome, promise } = call(req())
    const win = lastWindow()
    win.webContents.emit(
      'will-navigate',
      makeEvent(),
      'http://localhost:3000/auth?code=abc&state=x',
    )
    await promise

    expect(outcome).toHaveBeenCalledWith('resolved', {
      callbackUrl: 'http://localhost:3000/auth?code=abc&state=x',
    })
    expect(win.close).toHaveBeenCalled()
  })

  it('will-redirect 命中回调地址同样成功（302 重定向路径）', async () => {
    const { outcome, promise } = call(req())
    const win = lastWindow()
    const event = makeEvent()
    win.webContents.emit('will-redirect', event, 'http://localhost:3000/auth?code=xyz')
    await promise

    expect(event.preventDefault).toHaveBeenCalled()
    expect(outcome).toHaveBeenCalledWith('resolved', {
      callbackUrl: 'http://localhost:3000/auth?code=xyz',
    })
  })

  it('回调仅 origin+path 匹配：query 不参与、path 不同不误命中', async () => {
    const { outcome, promise } = call(req())
    const win = lastWindow()
    const event = makeEvent()
    // path 不同（/auth vs /auth/other）→ 不算回调，按白名单判定：localhost:3000 是回调 host，放行
    win.webContents.emit('will-redirect', event, 'http://localhost:3000/auth/other?code=1')
    await flush()

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(outcome).not.toHaveBeenCalled()

    // 正式回调仍可命中（流程未被打断）
    win.webContents.emit('will-redirect', makeEvent(), 'http://localhost:3000/auth?code=2')
    await promise
    expect(outcome).toHaveBeenCalledWith('resolved', {
      callbackUrl: 'http://localhost:3000/auth?code=2',
    })
  })

  it('导航到白名单外 host：拦截并拒绝（navigation_denied），后续事件不重复结算', async () => {
    const { outcome, promise } = call(req())
    const win = lastWindow()
    const event = makeEvent()
    win.webContents.emit('will-navigate', event, 'https://evil.example.com/phish')
    await promise

    expect(event.preventDefault).toHaveBeenCalled()
    expect(outcome).toHaveBeenCalledWith('rejected', OAUTH_WINDOW_NAVIGATION_DENIED)
    expect(win.close).toHaveBeenCalled()

    // 结算后再次 emit 不改变结果
    win.webContents.emit('will-navigate', makeEvent(), 'https://evil.example.com/again')
    await flush()
    expect(outcome).toHaveBeenCalledTimes(1)
  })

  it('authUrl 与回调 host 恒放行（不在 allowedHosts 中也不拒绝）', async () => {
    const { outcome, promise } = call(req())
    const win = lastWindow()
    // supabase host 不在 allowedHosts，是 authUrl 自身 host → 放行
    win.webContents.emit(
      'will-navigate',
      makeEvent(),
      'https://ref.supabase.co/auth/v1/callback?code=1',
    )
    await flush()
    expect(outcome).not.toHaveBeenCalled()

    // github.com（allowedHosts）→ 放行
    win.webContents.emit('will-navigate', makeEvent(), 'https://github.com/login/oauth/authorize')
    await flush()
    expect(outcome).not.toHaveBeenCalled()

    win.webContents.emit('will-redirect', makeEvent(), 'http://localhost:3000/auth?code=ok')
    await promise
    expect(outcome).toHaveBeenCalledWith('resolved', {
      callbackUrl: 'http://localhost:3000/auth?code=ok',
    })
  })

  it('用户关闭窗口：拒绝 cancelled，单飞守卫释放（可再次发起）', async () => {
    const first = call(req())
    lastWindow().emitClosed()
    await first.promise
    expect(first.outcome).toHaveBeenCalledWith('rejected', OAUTH_WINDOW_CANCELLED)

    // 守卫已释放：再次调用创建新窗口且不 busy
    const second = call(req())
    await flush()
    expect(second.outcome).not.toHaveBeenCalledWith('rejected', OAUTH_WINDOW_BUSY)
    expect(FakeBrowserWindow.instances).toHaveLength(2)

    lastWindow().webContents.emit('will-redirect', makeEvent(), 'http://localhost:3000/auth?code=3')
    await second.promise
    expect(second.outcome).toHaveBeenCalledWith('resolved', {
      callbackUrl: 'http://localhost:3000/auth?code=3',
    })
  })

  it('流程进行中重复调用：以 busy 拒绝且不创建新窗口', async () => {
    const first = call(req())
    const second = call(req())
    await second.promise

    expect(second.outcome).toHaveBeenCalledWith('rejected', OAUTH_WINDOW_BUSY)
    expect(FakeBrowserWindow.instances).toHaveLength(1)

    lastWindow().webContents.emit('will-redirect', makeEvent(), 'http://localhost:3000/auth?code=4')
    await first.promise
  })

  it('超时未完成：拒绝 timeout 并关窗', async () => {
    vi.useFakeTimers()
    const { outcome, promise } = call(req())
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    await promise

    expect(outcome).toHaveBeenCalledWith('rejected', OAUTH_WINDOW_TIMEOUT)
    expect(lastWindow().close).toHaveBeenCalled()
  })

  it('authUrl 非法：立即拒绝 invalid_request 且不创建窗口', async () => {
    const { outcome, promise } = call(req({ authUrl: 'not-a-url' }))
    await promise

    expect(outcome).toHaveBeenCalledWith('rejected', OAUTH_WINDOW_INVALID_REQUEST)
    expect(FakeBrowserWindow.instances).toHaveLength(0)
  })

  it('loadURL 失败（如网络异常）：拒绝 navigation_denied 并关窗', async () => {
    failNextLoad.value = true
    const { outcome, promise } = call(req())
    await promise
    const win = lastWindow()

    expect(outcome).toHaveBeenCalledWith('rejected', OAUTH_WINDOW_NAVIGATION_DENIED)
    expect(win.close).toHaveBeenCalled()
  })

  it('导航到无法解析的 URL：按 navigation_denied 中止（matchesCallback/safeHost 防御 catch）', async () => {
    const { outcome, promise } = call(req())
    const win = lastWindow()
    const event = makeEvent()
    win.webContents.emit('will-navigate', event, 'not-a-parseable-url')
    await promise

    expect(event.preventDefault).toHaveBeenCalled()
    expect(outcome).toHaveBeenCalledWith('rejected', OAUTH_WINDOW_NAVIGATION_DENIED)
    expect(win.close).toHaveBeenCalled()
  })

  it('结算时窗口已销毁：跳过事件清理与 close，仍正确回传结果', async () => {
    const { outcome, promise } = call(req())
    const win = lastWindow()
    win.isDestroyed.mockReturnValue(true)

    win.webContents.emit('will-redirect', makeEvent(), 'http://localhost:3000/auth?code=destroyed')
    await promise

    expect(outcome).toHaveBeenCalledWith('resolved', {
      callbackUrl: 'http://localhost:3000/auth?code=destroyed',
    })
    expect(win.close).not.toHaveBeenCalled()
    // 销毁后不再访问 webContents（不抛错即证明防御生效）
    expect(win.webContents.removeListener).not.toHaveBeenCalled()
  })

  it('拒绝 webview 嵌入（will-attach-webview preventDefault）', async () => {
    const { promise } = call(req())
    const win = lastWindow()
    const event = makeEvent()
    win.webContents.emit('will-attach-webview', event)
    win.webContents.emit('will-redirect', makeEvent(), 'http://localhost:3000/auth?code=5')
    await promise

    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('窗口安全基线：sandbox / contextIsolation 开启、nodeIntegration 关闭、无 preload', async () => {
    call(req())
    const win = lastWindow()
    const webPreferences = win.options?.webPreferences as Record<string, unknown>

    expect(webPreferences['sandbox']).toBe(true)
    expect(webPreferences['contextIsolation']).toBe(true)
    expect(webPreferences['nodeIntegration']).toBe(false)
    expect('preload' in webPreferences).toBe(false)
  })
})
