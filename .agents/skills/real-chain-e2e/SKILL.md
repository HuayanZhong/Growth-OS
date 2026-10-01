---
name: real-chain-e2e
description: Verify a feature against the REAL running stack (NestJS SSE API + Nuxt browser UI) instead of mocks — login with .env test credentials, drive SSE with HTTP client, drive the UI with the repo's Playwright. Use when a change touches the live request/stream path (chat streaming, uploads, auth flows) and component/unit mocks are not enough, or when asked to prove a flow works end to end.
---

Real-chain E2E for this repo: start the servers, exercise the API with a scripted HTTP client, exercise the UI with the repo-managed Playwright, then clean up. Component tests stay mocked; this skill covers what mocks cannot — actual compression, actual model calls, actual SSE framing.

## Process

### 1. Start the servers (background)

- Server: `pnpm --filter server dev` (port 4000; env injected from root `.env` by the script).
- Web UI: `pnpm --filter desktop dev` (Nuxt; port 3000 may be taken — use the printed fallback port).

### 2. Server-side: scripted HTTP (PowerShell 5.1)

Write a temp `.ps1` (delete after). Login via `POST /api/v1/auth/login` using `SUPABASE_TEST_EMAIL`/`SUPABASE_TEST_PASSWORD` read from root `.env` — never inline credentials in the command line.

PowerShell 5.1 traps (all hit in practice):

- **No-BOM UTF-8 scripts are read as GBK** → Chinese strings become mojibake and break parsing. Write ASCII-only scripts, or save UTF-8 with BOM.
- **`Invoke-WebRequest` throws `NullReferenceException`** on streamed/chunked responses (Expect: 100-continue bug). Fix: `[System.Net.ServicePointManager]::Expect100Continue = $false` + `-UseBasicParsing`.
- Error-response bodies may read back empty in `catch`; for exact envelope assertions prefer `curl.exe` (`-w "`nHTTP_STATUS:%{http_code}"`) over Invoke-*.
- Inline `-Command "..."` strips `$variables`; put logic in a file, not the command string.

To prove vision/model behavior, generate a real image with text via System.Drawing (e.g. the digits "7391"), inline it as a base64 data URL, and assert the reply contains that number.

### 3. Browser-side: repo Playwright, not external tools

- Do NOT use `npx` (repo `devEngines` blocks npm) and do not rely on MCP browser binaries (version-anchored, often missing). Use `pnpm --filter desktop exec` with the repo's `@playwright/test` (already a desktop dependency) from a temp `.tmp.mjs` script placed in `apps/desktop` (module resolution), deleted afterwards.
- Selectors MUST use `data-test` attributes — bare `textarea` collides with unrelated modals (create-agent modal also renders one).
- Hidden `input[type=file]` works with `setInputFiles` — this exercises the real compression pipeline (createImageBitmap/canvas) that component mocks skip.
- Login by filling `input[type="email"]` / `input[type="password"]` and clicking `button[type="submit"]`, then `waitForURL(/dashboard/)`.
- Assert streamed replies with `page.waitForFunction(() => document.body.innerText.includes(<marker>), null, { timeout })` using a marker embedded in test data.

### 4. Clean up

Delete temp scripts/images, stop background dev servers, then run the normal verification suite (`pnpm test` → `typecheck` → `lint` → `verify`).
