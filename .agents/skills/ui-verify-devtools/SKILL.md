---
name: ui-verify-devtools
description: Verify local web UI changes at runtime with the chrome-devtools MCP — start the dev server, drive the page (snapshot/click/screenshot), capture transient UI like toasts with an atomic in-page script, and inspect network/console. Use when a change is visible in the browser (or Electron renderer via its dev URL) and must be observed working before reporting done.
---

# UI Verification with chrome-devtools MCP

Prove UI changes at runtime instead of asserting "done" from code alone. All tools below are
`run_mcp` calls on the `mcp_chrome-devtools` server; read the tool JSON descriptors in
`.trae-cn/mcps/<scope>/mcp_chrome-devtools/tools/` before first use.

## 1. Start the app

- Launch the dev server as a background `web_server` command (repo: `pnpm dev`); poll with
  `CheckCommandStatus` until the port answers. Note port conflicts (EADDRINUSE means an old
  instance is still serving — that is usually fine for verification).
- In repos whose Nuxt module auto-launches Electron, the desktop window opens too. The
  chrome-devtools browser drives the **browser branch** of the app (no `window.desktop`) —
  IPC-dependent branches cannot be tested this way; verify those paths by unit test or by
  having the user run the real window.

## 2. Drive the page

1. `new_page` with the target URL → returns a `pageId` (use it on every subsequent call).
2. `take_snapshot` (a11y tree) to get element `uid`s — prefer it over screenshots for locating.
3. `click` / `fill` / `fill_form` by `uid`; the response reports navigation if the click causes one.
4. `take_screenshot` for visual confirmation (also after style/asset changes — compare optical
   size, alignment, and theme variants, not just existence).

## 3. Transient UI (toasts, spinners) — the atomic-script trick

Step-wise tool round trips (click → snapshot) are slower than a 3s toast lifetime, so the
evidence is consistently missed. Capture it in one in-page script instead:

```js
async () => {
  const gh = [...document.querySelectorAll('button')].find(b => b.textContent.includes('GitHub'))
  gh.click()
  await new Promise(r => setTimeout(r, 1500))
  return {
    toasts: [...document.querySelectorAll('.toast, [role=alert], .alert')].map(t => t.textContent.trim()),
    url: location.href,
    disabled: gh.disabled,
  }
}
```

Run it via `evaluate_script` with `waitForStableDom: false`. The returned JSON (toast text +
unchanged URL + button state) is the pass/fail evidence.

## 4. Network and console

- `list_network_requests` with `resourceTypes: ["fetch", "xhr"]` to cut page-resource noise and
  confirm which API calls a click actually fired (method, URL, status).
- `list_console_messages` with `types: ["error", "warn"]` for silent failures.
- For redirects: `click` reports the landed URL; `take_snapshot` shows the final page state.

## 5. Report

State observed evidence per scenario (request seen / toast text / final URL / screenshot),
not just "works". Failed scenarios become concrete fix candidates — measure first, then fix.
