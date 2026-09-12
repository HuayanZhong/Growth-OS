---
name: electron-cdp-verify
description: Verify Electron desktop-window behavior at runtime by launching the app with a CDP debug port and driving it with raw WebSocket CDP from a Node script (no extra deps) — covers renderer clicks/evals, secondary BrowserWindow popups, transient toasts, and multi-window tracking. Use when the flow under test lives in the real Electron shell (IPC, secureStorage, BrowserWindow channels) and the chrome-devtools MCP cannot attach, or before a proper Playwright Electron suite exists.
---

# Electron Runtime Verification via CDP

The chrome-devtools MCP drives its own browser — it cannot attach to the desktop shell. To verify
Electron-only behavior (IPC channels, BrowserWindow popups, secureStorage), launch the app with a
debug port and drive it over CDP with Node's native `fetch` + `WebSocket` (Node ≥ 22, zero deps).

## 1. Launch the shell with CDP

```js
import { spawn, execSync } from 'node:child_process'
const child = spawn(process.execPath,
  ['node_modules/electron/cli.js', 'dist/main.js', '--no-sandbox', '--remote-debugging-port=9222'],
  { cwd: 'packages/desktop-core',
    env: { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:3000' },
    stdio: 'ignore' })
```

- `VITE_DEV_SERVER_URL` decides dev-server vs packaged-file loading (see `bootstrap/window.ts`).
- Keep the dev server running first; poll `http://127.0.0.1:9222/json/version` until ready.
- No single-instance lock exists — parallel instances share `userData` (sessions/secure-store).
  A fresh instance is unauthenticated unless a previous one logged in.
- Cleanup in `finally`: `execSync(\`taskkill /PID ${child.pid} /T /F\`)` — plain `child.kill()`
  does not reap the tree on Windows.

## 2. Drive pages over raw CDP

- `GET /json/list` → page targets (`{ id, url, webSocketDebuggerUrl }`); connect per target and
  send `{ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }`.
- **Target URL is stale under SPA routing** — vue-router pushState does not update `/json/list`.
  Decide page state with in-page checks (`location.href`, `document.readyState`, element queries),
  never by the target's URL.
- **Initial context is `about:blank`** until the first document commits — poll
  `location.href + ' | ' + document.readyState` plus the element you need before interacting.
- **Target ids can change on cross-origin navigation** (process swap) — re-list targets instead of
  trusting a captured id, and detect popups as "any page target not matching the main window".

## 3. Popups and transient UI

- A `BrowserWindow` opened by main process appears as a new page target; connect to it the same way.
- Close it from inside via `window.close()` (equivalent to the user's X button).
- Toasts live ~3s — shorter than any tool round trip. Poll `document.body.innerText` every
  200–250ms right after the triggering action and capture matching lines; a single evaluation can
  also run click → wait → read atomically (see [ui-verify-devtools](../ui-verify-devtools/SKILL.md)
  for the web/MCP variant of this trick).

## 4. Report

Assert per scenario with observed evidence (captured toast text, final URL, window state), and say
plainly which paths were verified in the real shell vs mocked/unit-tested.
