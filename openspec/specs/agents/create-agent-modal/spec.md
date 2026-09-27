# agents/create-agent-modal Specification

## Purpose

让用户从侧边栏创建自定义 Agent：填写名称与描述、挑选表情小球形象，创建后新 Agent 经服务端目录持久化（server-agent-directory）并即时出现在目录各消费点，路由进入其任务开场页；目录以服务端为唯一数据源。

## Requirements

### Requirement: 创建入口

侧边栏 AGENTS 分组的「新建 Agent」按钮 SHALL 打开创建 Agent 弹窗。

#### Scenario: 点击新建按钮

- **WHEN** 用户点击侧边栏 AGENTS 分组的新建按钮
- **THEN** 创建 Agent 弹窗以模态方式打开，名称与描述为空，形象为默认表情

### Requirement: 表单校验

创建 Agent 弹窗 SHALL 要求名称必填（去除空白后非空），描述可选；名称无效时创建按钮 SHALL 处于禁用状态。

#### Scenario: 名称为空时禁止提交

- **WHEN** 名称输入为空或仅含空白字符
- **THEN** 创建按钮禁用，无法提交

#### Scenario: 名称有效时允许提交

- **WHEN** 名称去除空白后非空
- **THEN** 创建按钮可用

### Requirement: 表情形象选择

弹窗 SHALL 提供表情形象网格（策展子集），点选任一表情时预览球 SHALL 实时切换为该表情的动态渲染。

#### Scenario: 点选表情实时预览

- **WHEN** 用户点选表情网格中的某个表情
- **THEN** 预览小球立即切换为该表情的动态效果，且该表情格子呈现选中态

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

### Requirement: 目录一致性

新 Agent 创建成功后，侧边栏 AGENTS 分组与任务输入组件的 Agent 下拉 SHALL 即时显示该 Agent（含其表情形象），无需刷新页面。

#### Scenario: 创建后目录即时可见

- **WHEN** 创建成功且用户停留在任意页面
- **THEN** 侧边栏与 Agent 下拉中立即出现新 Agent 条目

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

### Requirement: 取消丢弃

用户通过取消按钮、Esc 或点击遮罩关闭弹窗时，系统 SHALL 丢弃未提交的输入且不改变目录。

#### Scenario: 取消创建

- **WHEN** 用户填写部分表单后点击取消
- **THEN** 弹窗关闭，目录不新增任何 Agent，再次打开时表单回到初始状态

### Requirement: 形象数据化

每个 Agent 的形象 SHALL 由目录中该 Agent 的表情字段与颜色字段共同决定；侧边栏子项、Agent 开场页标题、任务输入组件下拉中的小球 SHALL 一致渲染该组合，不再使用硬编码表情。

#### Scenario: 形象跟随数据

- **WHEN** 某自定义 Agent 的表情字段为 X 且颜色字段为 C
- **THEN** 侧边栏、开场页与下拉菜单中该 Agent 的小球均以表情 X 与颜色 C 渲染

### Requirement: 形象颜色定制

创建 Agent 弹窗 SHALL 提供预设色板（含默认米白），点选任一颜色时预览球 SHALL 实时应用该身体颜色；未显式选择时 SHALL 使用默认色。

#### Scenario: 点选颜色实时预览

- **WHEN** 用户点选色板中的某个颜色
- **THEN** 预览小球立即以该颜色渲染，且该色块呈现选中态

#### Scenario: 默认颜色

- **WHEN** 用户未点选任何颜色直接创建
- **THEN** 新 Agent 记录默认色，各消费点渲染不异常

### Requirement: 扩展能力选择

创建 Agent 弹窗的扩展能力区 SHALL 仅提供技能一类（对标 Coze 分类 chips，其余类别不做），以「技能 chip（含已选计数）+ 添加按钮」呈现。点击添加按钮 SHALL 打开技能选择弹窗，弹窗布局对齐 Coze 扩展弹窗：左侧分类栏（仅技能一项）、右侧「添加技能」标题 + 搜索框 + 技能卡片列表（名称、描述、添加/移除切换）。弹窗内 SHALL 提供「确定」：点确定后所选技能 SHALL 回填扩展能力区（chip 计数更新）；取消 / 关闭 / Esc SHALL 丢弃弹窗内的改动。技能取自静态占位目录，技能体系落地后替换；未选择时创建的 Agent SHALL 不带技能字段。

#### Scenario: 打开选择弹窗

- **WHEN** 用户点击扩展能力区的添加按钮
- **THEN** 技能选择弹窗打开，展示技能卡片列表与搜索框

#### Scenario: 搜索过滤

- **WHEN** 用户在搜索框输入关键字
- **THEN** 卡片列表按名称过滤，无匹配时显示空状态

#### Scenario: 未选择时显示占位

- **WHEN** 用户未选择任何技能
- **THEN** 扩展能力条显示占位文案「添加扩展能力（插件、技能和 MCP）」，不显示分类项；选择后以「类别 + 计数」chip 呈现

#### Scenario: 确定回填

- **WHEN** 用户在弹窗内添加若干技能并点击确定
- **THEN** 扩展能力区技能 chip 计数更新为所选数量；取消或直接关闭弹窗时不改动

### Requirement: 小球动画节奏

应用 SHALL 在引擎封装层将小球待机节奏（眼环轮换 / 眨眼 / 表情切换）按统一倍率加快，且不修改 vendored 引擎文件。

#### Scenario: 节奏加快

- **WHEN** 应用加载小球引擎后渲染任意小球
- **THEN** 其待机节奏快于上游默认（按统一倍率缩短间隔），所有消费点表现一致

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
