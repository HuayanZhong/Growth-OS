---
alwaysApply: false
description: 认证凭证安全规则：测试账号只放仓库根 .env（SUPABASE_TEST_EMAIL / SUPABASE_TEST_PASSWORD），禁止硬编码到代码、测试、rules、提交；.env 已被 gitignore，rules 只能引用变量名不得内联真实值。涉及测试账号、认证测试、凭证引用时使用。
---

# 认证凭证安全：测试账号只放 .env

**适用场景**：认证测试需要账号密码、引用测试凭证、审查提交内容时。

**要点**：

1. 测试账号（邮箱 + 密码）只写在仓库根 `.env`：`SUPABASE_TEST_EMAIL`、`SUPABASE_TEST_PASSWORD`。
2. `.env` 已被 `.gitignore` 忽略（`Local env files` 段），是唯一存放处——严禁在组件、composable、测试文件、规则（`.trae/rules/**`）、提交内容中硬编码账号密码。
3. 需要测试账号时从环境变量读取：vitest.config 已自动加载根 `.env`，测试内 `process.env.SUPABASE_TEST_EMAIL` 直接可用；AI 测试直接读 `.env` 文件获取。
4. 规则文件（含本文件）只引用变量名，不得内联真实账号值。

**验证**：

```bash
# 除 .env 与规则文件对变量名的引用外，不得出现真实账号值
rg -n 'SUPABASE_TEST_EMAIL|SUPABASE_TEST_PASSWORD' --glob '!*.env' --glob '!.env*' .
```
