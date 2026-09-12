# auth-oauth-login Delta

## Purpose

让桌面端用户通过第三方身份提供方一键登录 Growth OS，无需邮箱注册。本能力约定第三方 OAuth 登录的外部可观察行为：登录入口、授权窗口交互、会话建立与失败路径。首个接入的 provider 为 GitHub；QQ 在资质就绪前保持占位。

## ADDED Requirements

### Requirement: 登录页第三方入口

登录页第三方登录区 SHALL 提供 GitHub 登录按钮并移除微信按钮；QQ 按钮 SHALL 保留。点击 GitHub 按钮 SHALL 发起 GitHub OAuth 登录流程，点击 QQ 按钮 SHALL 不产生任何网络请求或状态变化。

#### Scenario: 点击 GitHub 发起授权

- **WHEN** 未登录用户在登录页点击 "GitHub 登录" 按钮
- **THEN** 应用打开授权窗口并加载 GitHub 的 OAuth 授权页面，登录页自身不发生跳转

#### Scenario: 微信入口不再出现

- **WHEN** 用户查看登录页第三方登录区
- **THEN** 只看到 "QQ 登录" 与 "GitHub 登录" 两个按钮，微信按钮及其图标不存在

#### Scenario: QQ 按钮保持占位

- **WHEN** 用户点击 "QQ 登录" 按钮
- **THEN** 不发起任何网络请求，界面保持原状（与现状行为一致）

### Requirement: 应用内授权窗口

OAuth 授权 SHALL 在应用内独立窗口中完成，不打开系统浏览器。授权窗口加载到与 OAuth 回调地址匹配的 URL 时，系统 SHALL 关闭该窗口并将回调结果交回登录流程。

#### Scenario: 授权成功后窗口关闭并交回结果

- **WHEN** 用户在授权窗口完成 GitHub 授权，页面重定向至 OAuth 回调地址
- **THEN** 授权窗口自动关闭，回调 URL 被完整交回登录流程用于会话建立

#### Scenario: 用户主动关闭授权窗口

- **WHEN** 用户在完成授权前关闭授权窗口
- **THEN** OAuth 流程静默中止，用户停留在登录页且可再次点击 GitHub 按钮重试，不残留锁定状态

### Requirement: OAuth 会话建立与持久化

OAuth 回调完成后，系统 SHALL 建立与邮箱密码登录完全同构的 Supabase 会话：经现有会话持久化机制保存、路由守卫放行、后续对自有后端的请求携带该会话的 access token 并通过服务端验证。

#### Scenario: 登录成功进入工作台

- **WHEN** OAuth 回调结果有效且会话建立成功
- **THEN** 用户被导航至与邮箱密码登录成功后相同的工作台首页

#### Scenario: 会话跨重启保持

- **WHEN** 用户通过 GitHub 登录成功后重启应用
- **THEN** 会话从现有持久化机制恢复，用户无需重新登录

#### Scenario: SSO 会话通过服务端验证

- **WHEN** 用户通过 GitHub 登录后，客户端调用自有后端的受保护端点并携带 access token
- **THEN** 服务端验证通过并正常返回（服务端无任何针对登录方式的区分）

### Requirement: OAuth 失败路径

授权被拒绝、授权窗口超时或回调结果换取会话失败时，系统 SHALL 向用户呈现中文错误提示，用户 SHALL 能重新发起登录，且应用 SHALL 不残留半完成会话状态。

#### Scenario: 用户在 GitHub 拒绝授权

- **WHEN** 用户在授权窗口中拒绝授权或授权出错
- **THEN** 窗口关闭，登录页呈现中文错误提示，原有登录状态不受影响

#### Scenario: 回调换取会话失败

- **WHEN** 回调 URL 中的凭据换取 Supabase 会话失败
- **THEN** 登录页呈现中文错误提示，用户可重试，应用不写入无效会话

#### Scenario: 授权窗口超时

- **WHEN** 授权窗口长时间停留且未发生任何导航结果
- **THEN** 系统关闭窗口并按失败路径处理，呈现中文错误提示
