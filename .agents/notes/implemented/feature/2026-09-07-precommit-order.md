# Agent Note: pre-commit 中 docs gate 后置于 lint-staged

Status: implemented

## Problem

pre-commit 原顺序是 verify-docs → lint-staged。lint-staged 会对 staged 的 `.ts` 跑 oxfmt 格式化（长行折行），生成式文档（`docs/event-catalog.md` 等）里记录的"文件:行号"调用点引用随之移动——提交时刻的 freshness 校验对提交后的内容无效：catalog 以格式化前的行号入库，之后任何 `verify-docs` 运行都会报 stale（turn 管线提交后实际发生过）。

## Decision

- pre-commit 顺序对调：**lint-staged 先跑（格式化 + re-stage），verify-docs 后跑**——docs gate 看到的是格式化后的最终状态，提交时刻的校验结果对提交内容恒成立。
- AGENTS.md 的 hook 描述已同步，防止顺序被"顺手"改回。

## Alternatives considered

- 生成式目录去掉行号、只记文件：可消除对行号的敏感，但丢失调用点定位价值；行号在时序修复后是稳定的。
- lint-staged 后再强制跑一次 generate:events：verify-docs 本身就会重跑全部生成器并比对，重复生成没有额外收益。

## Consequences

- 任何把 docs gate 挪回 lint-staged 之前的改动，都会重新引入"提交时 fresh、提交后 stale"的窗口；改回前必须解决格式化与生成式文档的时序问题。
- 提交中如出现 generated doc stale 报错，说明 staged 源码变更未同步重新生成（`pnpm generate:events` / `generate:config` / `generate:graph`），按提示重新生成并一起提交。
