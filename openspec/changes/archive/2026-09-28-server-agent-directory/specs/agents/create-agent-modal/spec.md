# agents/create-agent-modal Delta

## MODIFIED Requirements

### Requirement: 创建 Agent

名称有效时提交，前端 SHALL 将创建请求（名称、描述、所选表情与颜色、已选技能）发送到服务端 Agent 目录；slug 由服务端生成，前端不再生成 slug。创建期间提交按钮 SHALL 禁用。创建成功后系统 SHALL 将服务端返回的新 Agent 追加到目录，新 Agent 的 isDefault SHALL 为 false，弹窗 SHALL 关闭，路由 SHALL 切换到新 Agent 的任务开场页。

#### Scenario: 提交创建

- **WHEN** 用户在名称有效时点击创建且服务端创建成功
- **THEN** 新 Agent 以服务端返回的数据追加到目录，弹窗关闭，页面导航到 /dashboard/agents/<服务端 slug>

#### Scenario: slug 唯一性

- **WHEN** 连续创建多个 Agent（即使名称相同）
- **THEN** 服务端为每个 Agent 生成彼此不同的 slug

#### Scenario: 提交期间防重复

- **WHEN** 创建请求尚未返回时用户再次点击创建按钮
- **THEN** 按钮处于禁用状态，不发出第二个请求

### Requirement: 目录持久化

自定义 Agent 与内置默认 Agent SHALL 均持久化到服务端（默认 Agent 为迁移 seed 的全局行），目录 SHALL 完全以服务端为数据源，前端不再维护本地目录常量或本地存储。登录用户加载目录时系统 SHALL 从服务端获取目录数据；目录数据获取失败时，系统 SHALL 呈现空目录与空态提示且不产生未处理错误。

#### Scenario: 重启后仍在

- **WHEN** 创建自定义 Agent 后重启应用，或退出登录后重新登录同一账号
- **THEN** 该 Agent 仍出现在目录中，名称与形象不变

#### Scenario: 存储损坏回退

- **WHEN** 目录列表请求失败（网络错误或非 2xx 响应）
- **THEN** 目录呈现为空并显示空态提示，页面正常可用，不产生未处理错误

#### Scenario: 用户隔离

- **WHEN** 用户 A 创建了自定义 Agent，用户 B 登录后加载目录
- **THEN** 用户 B 的目录中不出现用户 A 创建的 Agent，但默认 Agent 仍然可见

## ADDED Requirements

### Requirement: 创建失败呈现

创建请求失败时，系统 SHALL 在弹窗内呈现错误信息（不关闭弹窗、不路由跳转），表单 SHALL 保留已填内容，用户 SHALL 可修正后重试。

#### Scenario: 服务端校验失败

- **WHEN** 创建请求返回 400（入参未通过服务端校验）
- **THEN** 弹窗内呈现错误提示，表单内容保留

#### Scenario: 服务端不可用

- **WHEN** 创建请求网络失败或返回 5xx
- **THEN** 弹窗内呈现错误提示，弹窗不关闭，用户可重试

### Requirement: 删除 Agent

侧边栏 AGENTS 分组中的自定义 Agent 条目 SHALL 提供删除操作（默认 Agent 条目 SHALL NOT 提供该入口）；触发删除时系统 SHALL 弹出二次确认。确认后系统 SHALL 请求服务端删除该 Agent，成功后 SHALL 将其从目录即时移除（无需刷新）；若当前路由为该 Agent 的页面，SHALL 导航到默认 Agent 的任务开场页。删除失败时 SHALL 呈现错误提示且条目保留。

#### Scenario: 确认删除

- **WHEN** 用户对某自定义 Agent 条目触发删除并在确认弹窗中确认
- **THEN** 服务端删除该记录，侧边栏与 Agent 下拉中该条目即时消失

#### Scenario: 默认 Agent 无删除入口

- **WHEN** 用户查看默认 Agent（小花颜）条目
- **THEN** 该条目不呈现任何删除操作

#### Scenario: 取消删除

- **WHEN** 用户在二次确认弹窗中取消
- **THEN** 不发出删除请求，目录不变

#### Scenario: 删除当前页 Agent 后导航

- **WHEN** 用户删除的 Agent 正是当前浏览的 Agent 页面
- **THEN** 页面导航到默认 Agent 的任务开场页

#### Scenario: 删除失败

- **WHEN** 删除请求失败（网络错误、403 或 5xx）
- **THEN** 呈现错误提示，该条目保留在目录中
