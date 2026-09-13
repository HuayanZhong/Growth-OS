# e2e-testing — Delta

## Purpose

为桌面端建立可持续回归的端到端测试层：在真实浏览器与真实 Electron shell 中验证 登录 → 工作台 → 登出 用户主链路与应用可启动性，作为单元/组件测试（vitest）与 server API 层 e2e（supertest）之外的第三层保障。本能力约定 E2E 的可执行方式、覆盖范围、凭据注入与缺失语义。

## ADDED Requirements

### Requirement: E2E 套件单命令可执行

E2E 测试 SHALL 通过单条命令完成全部执行，包括 web 模式所需 dev server 的自动拉起与结束后清理，不要求执行者手工准备运行环境或清理残留进程。

#### Scenario: 单命令运行全量 E2E

- **WHEN** 执行者在 `apps/desktop` 下运行 E2E 测试命令（凭据已就位的环境）
- **THEN** dev server 被自动拉起，web 模式与 Electron 冒烟用例依次执行，结束后无残留监听进程

#### Scenario: 已有 dev server 时复用而非冲突

- **WHEN** 执行者已自行启动 Nuxt dev server（3000 端口在监听）再运行 E2E 命令
- **THEN** 套件复用现有 dev server 完成执行，不发生端口冲突

### Requirement: web 模式主链路覆盖登录到登出

web 模式（真实浏览器加载 dev server）SHALL 覆盖用户主链路：真实凭据登录成功进入工作台、登出回到认证页、无效凭据被拒绝、登录/注册表单可双向切换，且每条链路断言的是页面级可观察结果而非内部实现。

#### Scenario: 真实凭据登录成功进入工作台

- **WHEN** 在认证页提交有效的测试账号凭据
- **THEN** 浏览器最终停留在工作台路由，工作台布局可见

#### Scenario: 登出回到认证页

- **WHEN** 已登录用户在工作台执行登出操作并确认
- **THEN** 浏览器回到认证页，再次访问受保护路由时被重定向回认证页

#### Scenario: 无效凭据被拒绝

- **WHEN** 提交错误密码
- **THEN** 用户停留在认证页，界面出现错误反馈，不发生向工作台的跳转

#### Scenario: 登录注册表单双向切换可用

- **WHEN** 在认证页点击切换到注册、再切换回登录
- **THEN** 目标表单可见且可交互，页面无遮挡残留（动画结束态不影响操作）

### Requirement: Electron 冒烟验证真实 shell

Electron 冒烟 SHALL 启动生产构建产物（而非 dev server），验证应用可启动、主窗口创建成功且认证页在窗口内完成渲染。

#### Scenario: 生产构建产物可启动并渲染认证页

- **WHEN** 依赖 `pnpm build` 的产物执行 Electron 冒烟测试
- **THEN** Electron 应用启动、主窗口创建，认证页在窗口内渲染完成（表单元素存在）

#### Scenario: 桌面窗口内加载而非外跳浏览器

- **WHEN** Electron 应用启动
- **THEN** 页面内容加载在应用自身窗口内，未打开系统浏览器

### Requirement: 真实凭据注入与缺失 skip 语义

E2E 测试 SHALL 从环境变量读取真实 Supabase 测试账号凭据，SHALL NOT 将凭据硬编码进测试代码或测试报告；凭据缺失时依赖真实凭据的用例 SHALL 自动 skip，其余用例 SHALL 照常执行，且整体退出码不受 skip 影响。

#### Scenario: 凭据存在时真实登录用例执行

- **WHEN** 环境变量 `SUPABASE_TEST_EMAIL` 与 `SUPABASE_TEST_PASSWORD` 已设置且非空
- **THEN** 真实登录/登出用例以该凭据执行

#### Scenario: 凭据缺失时自动 skip

- **WHEN** 上述任一环境变量缺失或为空
- **THEN** 依赖真实凭据的用例被跳过并在报告中标注 skipped，不依赖凭据的用例（如无效凭据拒绝、表单切换、Electron 冒烟）照常执行，命令整体退出码为成功

#### Scenario: 凭据不落盘

- **WHEN** E2E 测试运行并产生报告/截图等产物
- **THEN** 凭据明文不出现在测试代码、报告、截图或任何 git 跟踪的文件中

### Requirement: 浏览器范围限定 Chromium

E2E 框架 SHALL 仅以 Chromium 作为唯一浏览器引擎运行全部用例，不要求安装或执行 Firefox/WebKit 二进制。

#### Scenario: 仅 Chromium 参与运行

- **WHEN** 执行 E2E 测试命令
- **THEN** 全部用例在 Chromium 引擎上运行一次，无需 firefox/webkit 浏览器二进制存在
