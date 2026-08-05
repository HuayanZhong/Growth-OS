# Token 安全存储方案（Electron 桌面端）

> 状态：方案设计（未实现）
> 相关文件：`useSupabase.ts` / `useAuth.ts` / `modules/electron.ts` / `packages/desktop-core/src/{main,preload}.ts` / `packages/shared/src/utils/ipc-channels.ts`
> 现状：session 全量明文存 `localStorage`（key `supabase.auth.token`），包含 access token + refresh token + user 全量数据

---

## 一、现状与问题

当前 [useSupabase.ts](file:///c:/Users/Administrator/Desktop/Growth%20OS/apps/desktop/app/composables/useSupabase.ts#L14-L20) 使用 Supabase 默认行为（`persistSession: true`），session 明文写入 `localStorage`：

- **access token（短期，~1h）** 明文落盘
- **refresh token（长期，可续期）** 明文落盘
- **user 全量信息** 明文落盘

问题：
1. localStorage 对同源任何 JS 可读，Electron 渲染进程若存在 XSS，refresh token 直接泄露，攻击者可长期接管账号
2. 桌面端无浏览器沙箱隔离，localStorage 数据落盘为明文 SQLite/LevelDB 文件，磁盘窃取/其他进程可读
3. 不符合现代桌面应用（VS Code、1Password 等）的凭证存储规范

---

## 二、大厂 / 业界方案调研

### 1. VS Code（微软）—— safeStorage + userData 加密库

- 扩展的 SecretStorage API 在桌面端**直接用 Electron `safeStorage` 加密后写入 userData 目录的 SQLite DB**；Web 端用 Double Key Encryption (DKE)
- 主进程持有 OS 密钥，渲染进程只能通过受限 API 访问密文
- 官方文档原文：*"For VS Code desktop, this leverages Electron's safeStorage API"*、*"we use Electron's safeStorage API to encrypt secrets before storing them on the filesystem"*

来源：
- https://code.visualstudio.com/api/extension-capabilities/common-capabilities#data-storage
- https://github.com/microsoft/vscode-docs/blob/main/api/advanced-topics/remote-extensions.md
- https://github.com/microsoft/vscode-discussions/discussions/748（微软员工 TylerLeonhardt 确认）

### 2. Electron 官方 safeStorage—— 行业事实标准

- **Windows**：DPAPI（密钥由当前登录用户凭据保护，防其他用户，不防同用户空间恶意进程）
- **macOS**：Keychain（最强，其他应用访问需授权）
- **Linux**：libsecret / kwallet；**无 keyring 时 fallback `basic_text`（等于明文！）**，需用 `safeStorage.getSelectedStorageBackend()` 检测
- 新版本官方推荐**异步 API**（`encryptStringAsync`/`decryptStringAsync`），支持密钥轮换与临时不可用处理
- keytar 库已不维护（Azure BatchExplorer 等已迁移到 safeStorage）

来源：
- https://www.electronjs.org/zh/docs/latest/api/safe-storage
- https://github.com/Azure/BatchExplorer/issues/3001

### 3. 现代桌面 OAuth 架构（RFC 8252 / PKCE）—— 长期演进方向

- 用**系统浏览器**登录（不用内嵌 BrowserWindow，避免凭证被拦截），自定义协议（`growthos://auth/callback`）或 loopback 回传授权码
- **access token 只放内存**；**refresh token 用 safeStorage 加密持久化**
- PKCE 取代 client secret（桌面端无法安全存 secret）
- Electron 主进程完成授权码交换，渲染进程尽量不接触长期凭证

来源：
- https://blog.openreplay.com/add-authentication-electron-app/
- https://claudelab.net/en/articles/api-sdk/claude-api-electron-desktop-app-production-guide

### 4. Supabase 官方：自定义 storage adapter 是标准做法

- `createClient(..., { auth: { storage: myAdapter } })` 注入实现 `SupportedStorage`（`getItem`/`setItem`/`removeItem`，支持 async）的自定义存储
- 官方文档明确此接口专为"非 localStorage 环境"设计（含 React Native SecureStore 加密存储的完整示例）
- 我们已有类型化 IPC 基础设施（`IpcChannelMap` → `handleIpc` → `window.desktop`），加一个 `secureStore` 通道即可把加密层放到主进程

来源：
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/reference/javascript/initializing

---

## 三、推荐方案（分三阶段，渐进实施）

### Phase 1（近期，推荐立即做）：safeStorage 加密持久化

**目标**：localStorage 彻底不再存 token，session 以 OS 级加密密文存 `userData` 磁盘。

**改动点**：

1. **`packages/shared/src/utils/ipc-channels.ts`** —— `IpcChannelMap` 加一个通道：

```ts
/** 主进程安全存储（safeStorage 加密，仅 Electron 环境可用） */
secureStore: {
  request: { action: 'get' | 'set' | 'remove'; key: string; value?: string }
  response: string | null
}
```

2. **`packages/desktop-core/src/main.ts`** —— 注册 handler，加密/解密都在主进程：

```ts
import { safeStorage } from 'electron'
import { createHash } from 'node:crypto'

const secureDir = () => path.join(app.getPath('userData'), 'secure-store')

handleIpc('secureStore', async ({ action, key, value }) => {
  const file = path.join(secureDir(), `${createHash('sha256').update(key).digest('hex')}.enc`)
  if (!safeStorage.isEncryptionAvailable()) {
    console.error(LOG_TAG, 'safeStorage 不可用（Linux 可能无 keyring）')
    return null
  }
  switch (action) {
    case 'get':
      if (!existsSync(file)) return null
      return safeStorage.decryptString(readFileSync(file))   // 异步 API 见备注
    case 'set':
      mkdirSync(secureDir(), { recursive: true })
      writeFileSync(file, safeStorage.encryptString(value ?? ''))
      return null
    case 'remove':
      rmSync(file, { force: true })
      return null
  }
})
```

> 备注：按 Electron 最新文档，优先用异步 `encryptStringAsync` / `decryptStringAsync`（支持密钥轮换）；同步 API 未来可能弃用。

3. **`packages/desktop-core/src/preload.ts`** —— `api` 加 `secureStore`：

```ts
secureStore: (request) => invokeIpc('secureStore', request)
```

4. **新增 `apps/desktop/app/composables/useSecureStorage.ts`** —— Supabase `SupportedStorage` 适配器：

```ts
import type { SupportedStorage } from '@supabase/supabase-js'

// Electron 环境走主进程 safeStorage；纯浏览器（web 预览）fallback localStorage
function isElectron() {
  return typeof window !== 'undefined' && Boolean(window.desktop?.secureStore)
}

export const secureStorage: SupportedStorage = {
  async getItem(key) {
    return isElectron() ? window.desktop.secureStore({ action: 'get', key })
                         : localStorage.getItem(key)
  },
  async setItem(key, value) {
    return isElectron() ? window.desktop.secureStore({ action: 'set', key, value })
                        : localStorage.setItem(key, value)
  },
  async removeItem(key) {
    return isElectron() ? window.desktop.secureStore({ action: 'remove', key })
                        : localStorage.removeItem(key)
  },
}
```

5. **`apps/desktop/app/composables/useSupabase.ts`** —— 注入 storage：

```ts
client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: secureStorage,
  },
})
```

6. **一次性迁移**：首次登录成功后，清除旧的 `localStorage['supabase.auth.token']`（及 `-user`）残留。

### Phase 2（中期）：access token 不落盘，磁盘只存 refresh token

- `useSecureStorage.ts` 内部维护**内存 session**；`setItem` 时裁剪持久化内容：磁盘只存 `refresh_token`（+ `expires_at` 与最小 user 摘要），`getItem` 返回时从 refresh token 恢复完整 session 结构（满足 auth-js `_isValidSession`）
- 效果：XSS/内存 dump 只能拿到当前短效 access token；长期有效的 refresh token 只在需要刷新时经 IPC 解密进内存、用完即弃
- 需要注意：auth-js 的 `__loadSession` 要求 `access_token/refresh_token/expires_at` 三字段齐全才判定有效，裁剪方案必须保证 `getItem` 的返回结构完整

### Phase 3（远期，对标 RFC 8252）：PKCE + 系统浏览器登录

- 登录改用系统浏览器 + 自定义协议（`growthos://auth/callback`）或 loopback 回传授权码
- 授权码交换放主进程；refresh token 加密存主进程，渲染进程完全不持有长期凭证
- 需要：Supabase 项目配置 `redirectTo`、`app.setAsDefaultProtocolClient` 注册协议、electron-builder `protocols` 配置
- 这是最大改造，建议单独排期

---

## 四、安全边界与注意事项

1. **safeStorage 不是万能**：Windows DPAPI 只防"其他用户"，不防同用户空间的其他进程；Linux 无 keyring 时 `basic_text` 等于明文，需检测并在 UI 提示
2. **渲染进程仍持有 access token**（业务需要，Supabase client 在渲染进程）；XSS 面靠现有 CSP + `contextIsolation` 缓解，属于可接受风险（与 VS Code 一致）
3. **`detectSessionInUrl`**：Phase 3 的 deep link 回调需要主进程解析 token，渲染进程的 `detectSessionInUrl` 逻辑届时调整
4. **测试影响**：现有 auth 测试在无 env 时全挂（根 test 脚本未加载 .env），本次实现需带 env 跑；`useSecureStorage` 需要 mock `window.desktop`
5. **不要引入 keytar**（已弃用），safeStorage 是 Electron 事实标准

---

## 五、验证方式

- **单元**：`safeStorage` roundtrip（encrypt → decrypt 一致）；`useSecureStorage` 在 mock `window.desktop` 下 get/set/remove 行为
- **端到端**（需真实账号）：登录后检查 `userData/secure-store/` 下为密文、`localStorage` 无 `supabase.auth.token`；重启应用会话保持
- **回归**：登录/注册/登出流程 + 守卫跳转

## 六、实施顺序建议

1. Phase 1 落地（改动 6 个文件，2-3 步走完，收益最大：localStorage 不再存明文 token）
2. Phase 2 强化（access token 不落盘）
3. Phase 3 演进（PKCE 系统浏览器登录）—— 需与产品确认登录体验变化
