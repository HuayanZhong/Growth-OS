---
alwaysApply: false
scene: git_message
description: Git 提交信息规则定义
---

# Git 提交信息规则

## 格式

```
<type>(<scope>): <subject>
```

- **type** 和 **scope** 均为小写英文
- **subject** 使用中文描述
- 总长度不超过 72 字符

## Type（必填）

| Type       | 使用场景                     |
| ---------- | ---------------------------- |
| `feat`     | 新功能                       |
| `fix`      | 修复 Bug                     |
| `build`    | 构建系统或外部依赖变更       |
| `chore`    | 杂项（配置、重构、工具链等） |
| `ci`       | CI/CD 配置或脚本变更         |
| `docs`     | 纯文档变更                   |
| `perf`     | 性能优化                     |
| `refactor` | 代码重构（非功能、非修复）   |
| `revert`   | 回滚提交                     |
| `style`    | 代码格式变更（非逻辑改动）   |
| `test`     | 添加或修改测试               |

## Scope（可选）

Monorepo 包路径对应的 scope：

| Scope          | 对应路径                 |
| -------------- | ------------------------ |
| `desktop`      | `apps/desktop`           |
| `desktop-core` | `packages/desktop-core`  |
| `turbo`        | `turbo.json`             |
| `typescript`   | `tooling/typescript`     |
| `deps`         | 根依赖或统一版本升级     |
| `repo`         | 仓库级配置（根目录文件） |

如果改动涉及多个包且不宜拆分提交，可以不写 scope。

## Subject 规范

- 使用中文，简洁陈述做了什么
- 以动词开头（新增 / 修复 / 重构 / 移除 / 升级 / 迁移 等）
- 不加句号
- 不加空泛描述（如"修改了部分代码"）

## 示例

```
feat(desktop): 新增用户登录页面
fix(desktop-core): 修复窗口创建时白屏问题
build(turbo): 升级 turbo 到 2.x 并调整任务编排
chore: 更新 TypeScript 配置并清理无用依赖
docs: 完善项目 README 和架构文档
perf(desktop): 优化虚拟列表渲染性能
```

## 规则

1. 一条提交只做一件事。如果改动涉及多个独立逻辑，拆分为多次提交。
2. 如果改动会破坏 API 兼容性，在 subject 中注明 `BREAKING CHANGE`。
3. 不提交未完成的 WIP 代码。
4. subject 直截了当，不写"为什么要改"（这个放在 body 中），只写"改了什么"。
