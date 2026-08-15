---
alwaysApply: false
description: Credential safety: test accounts live only in repo root .env (SUPABASE_TEST_EMAIL / SUPABASE_TEST_PASSWORD); never hard-code them into code, tests, rules, or commits; rules reference variable names only. Use for test accounts or credentials.
---

# Auth Credential Safety: Test Accounts Only in .env

**When to use**: when auth tests need account credentials, when referencing test credentials, when reviewing commit contents.

**Key points**:

1. Test accounts (email + password) live only in the repo root `.env`: `SUPABASE_TEST_EMAIL`, `SUPABASE_TEST_PASSWORD`.
2. `.env` is gitignored (under the `Local env files` section) and is the only allowed location — never hard-code account credentials into components, composables, test files, rules (`.trae/rules/**`), or commit contents.
3. Read test accounts from environment variables: vitest.config auto-loads the root `.env`, so `process.env.SUPABASE_TEST_EMAIL` works directly inside tests; AI tests read the `.env` file directly.
4. Rule files (including this one) only reference variable names, never inline real account values.

**Verification**:

```bash
# No real account values anywhere except .env and variable-name references in rule files
rg -n 'SUPABASE_TEST_EMAIL|SUPABASE_TEST_PASSWORD' --glob '!*.env' --glob '!.env*' .
```
