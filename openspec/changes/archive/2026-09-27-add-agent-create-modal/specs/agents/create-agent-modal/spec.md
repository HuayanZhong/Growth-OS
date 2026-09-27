# Delta Spec: agents/create-agent-modal

## Purpose

让用户从侧边栏创建自定义 Agent：填写名称与描述、挑选表情小球形象，创建后新 Agent 即时出现在目录各消费点、持久化到本地，并路由进入其任务开场页。静态设计阶段目录仅存于前端本地，服务端模型落地后整体迁移。

## ADDED Requirements

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

名称有效时提交，系统 SHALL 生成唯一 slug，将新 Agent（名称、描述、所选表情）追加到 Agent 目录；新 Agent 的 isDefault SHALL 为 false。创建成功后弹窗 SHALL 关闭，路由 SHALL 切换到新 Agent 的任务开场页。

#### Scenario: 提交创建

- **WHEN** 用户在名称有效时点击创建
- **THEN** 新 Agent 以所选形象追加到目录，弹窗关闭，页面导航到 /dashboard/agents/<新 slug>

#### Scenario: slug 唯一性

- **WHEN** 连续创建多个 Agent（即使名称相同）
- **THEN** 每个 Agent 获得彼此不同的 slug

### Requirement: 目录一致性

新 Agent 创建成功后，侧边栏 AGENTS 分组与任务输入组件的 Agent 下拉 SHALL 即时显示该 Agent（含其表情形象），无需刷新页面。

#### Scenario: 创建后目录即时可见

- **WHEN** 创建成功且用户停留在任意页面
- **THEN** 侧边栏与 Agent 下拉中立即出现新 Agent 条目

### Requirement: 目录持久化

自定义 Agent SHALL 在应用重启后仍然存在；内置默认 Agent SHALL 始终保留且 isDefault 保持 true；本地存储不可用或数据损坏时，系统 SHALL 回退为仅内置目录且不产生未处理错误。

#### Scenario: 重启后仍在

- **WHEN** 创建自定义 Agent 后重启应用
- **THEN** 该 Agent 仍出现在目录中，名称与形象不变

#### Scenario: 存储损坏回退

- **WHEN** 本地存储中的目录数据无法解析
- **THEN** 应用回退为仅含内置默认 Agent 的目录，页面正常可用

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
