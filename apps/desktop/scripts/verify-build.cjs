/**
 * 模拟 Electron 打包后的 build 模式，验证 file:// 协议下资源路径是否正确加载。
 *
 * 运行方式：
 *   pnpm --filter desktop build
 *   pnpm --filter desktop verify:build
 *
 * 检查项：
 *   1. index.html 是否存在
 *   2. 页面是否成功加载（did-finish-load）
 *   3. 资源请求是否全部成功（无 4xx/5xx）
 *   4. 页面 DOM 是否有实际内容（非空白）
 *   5. 控制台是否有 warning+
 */

const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

// 用临时 userData 目录，避免 Chromium LevelDB 清理日志淹没输出
app.setPath('userData', path.join(os.tmpdir(), 'electron-verify-build'))

const htmlPath = path.join(__dirname, '..', '.output', 'public', 'index.html')
const resultPath = path.join(os.tmpdir(), 'electron-verify-result.json')

// 预检：build 产物是否存在
if (!fs.existsSync(htmlPath)) {
  console.error('\n✗ index.html 不存在，请先运行 pnpm --filter desktop build')
  console.error(`  期望路径: ${htmlPath}\n`)
  process.exit(1)
}

app.whenReady().then(() => {
  // headless 窗口，不显示 GUI
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true },
  })

  const errors = []
  const resources = []

  // 监听所有网络请求完成事件（file:// 协议也走这个）
  win.webContents.session.webRequest.onCompleted(({ statusCode, url }) => {
    resources.push({ statusCode, url })
  })

  // 监听页面加载失败
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    errors.push(`页面加载失败: ${errorDescription} (code ${errorCode}) URL: ${validatedURL}`)
  })

  // 监听控制台消息（Electron 43+ 新签名：解构 event 对象，level 为字符串）
  // 旧签名 (event, level, message, ...) 已弃用，见 breaking-changes 文档
  win.webContents.on('console-message', ({ level, message }) => {
    // level: "debug" | "info" | "warning" | "error"
    // 过滤已知的 Electron Security Warning（CSP 警告，打包后不显示，非资源加载问题）
    const isSecurityWarning =
      typeof message === 'string' &&
      (message.includes('Security Warning') || message.includes('Content-Security-Policy'))
    if ((level === 'warning' || level === 'error') && !isSecurityWarning) {
      errors.push(`控制台 [${level}]: ${message}`)
    }
  })

  // 页面加载完成后执行 DOM 检查
  win.webContents.on('did-finish-load', async () => {
    let report = ''
    let passed = false
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const scripts = [...document.querySelectorAll('script')];
          const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
          const nuxtConfig = window.__NUXT__?.config || {};
          return {
            title: document.title,
            baseURI: document.baseURI,
            locationHref: window.location.href,
            scriptCount: scripts.length,
            scriptSrcs: scripts.map(s => s.src),
            scriptRawSrcs: scripts.map(s => s.getAttribute('src')),
            linkCount: links.length,
            linkHrefs: links.map(l => l.href),
            linkRawHrefs: links.map(l => l.getAttribute('href')),
            bodyText: (document.body?.innerText || '').substring(0, 200),
            bodyHasContent: document.body?.children.length > 0,
            nuxtBaseURL: nuxtConfig.app?.baseURL,
            nuxtBuildAssetsDir: nuxtConfig.app?.buildAssetsDir,
            nuxtCdnURL: nuxtConfig.app?.cdnURL,
          };
        })()
      `)

      const failedResources = resources.filter((r) => r.statusCode >= 400 || r.statusCode === -3)
      const hasContent = result.bodyHasContent && result.bodyText.length > 0
      const hasErrors = errors.length > 0
      const hasFailedResources = failedResources.length > 0
      passed = !hasErrors && !hasFailedResources && hasContent

      report += '========== Build 验证报告 ==========\n\n'
      report += `加载文件: ${htmlPath}\n`
      report += `协议: file://\n`
      report += `document.baseURI: ${result.baseURI}\n`
      report += `window.location.href: ${result.locationHref}\n`
      report += `页面标题: ${result.title || '(无)'}\n`
      report += `\n--- Nuxt 运行时配置 ---\n`
      report += `app.baseURL: ${result.nuxtBaseURL || '(未设置)'}\n`
      report += `app.buildAssetsDir: ${result.nuxtBuildAssetsDir || '(未设置)'}\n`
      report += `app.cdnURL: ${result.nuxtCdnURL || '(未设置)'}\n`
      report += `\n--- Script 标签 (${result.scriptCount}) ---\n`
      result.scriptSrcs.forEach((src, i) => {
        const raw = result.scriptRawSrcs[i]
        report += `  [${i}] raw="${raw || ''}" -> src="${src || ''}"\n`
      })
      report += `\n--- CSS 标签 (${result.linkCount}) ---\n`
      result.linkHrefs.forEach((href, i) => {
        const raw = result.linkRawHrefs[i]
        report += `  [${i}] raw="${raw || ''}" -> href="${href || ''}"\n`
      })
      report += `\n页面内容: ${result.bodyText || '(空)'}\n`
      report += `\n--- 资源请求 (${resources.length}) ---\n`
      resources.forEach((r) => {
        const mark = r.statusCode >= 400 ? '✗' : '✓'
        report += `  ${mark} [${r.statusCode}] ${r.url}\n`
      })
      if (failedResources.length > 0) {
        report += `\n失败的资源请求 (${failedResources.length}):\n`
        failedResources.forEach((r) => {
          report += `  ✗ [${r.statusCode}] ${r.url}\n`
        })
      }
      report += '\n========== 验证结果 ==========\n'
      if (passed) {
        report += '✓ 验证通过：file:// 协议下资源加载正常，页面内容渲染成功\n'
      } else {
        report += '✗ 验证失败：\n'
        if (hasErrors)
          errors.forEach((e) => {
            report += `  - ${e}\n`
          })
        if (hasFailedResources) report += `  - ${failedResources.length} 个资源请求失败\n`
        if (!hasContent) report += '  - 页面内容为空（资源加载失败导致渲染失败）\n'
      }
    } catch (e) {
      report += `\n✗ 执行 DOM 检查失败: ${e.message}\n`
    }

    // 写结果到文件（避免 Electron stderr 噪音淹没 stdout）
    fs.writeFileSync(resultPath, report, 'utf8')
    app.quit()
  })

  // 超时保护：10 秒未加载完成则退出
  setTimeout(() => {
    console.log('\n✗ 超时：页面 10 秒内未加载完成')
    errors.forEach((e) => console.log(`  - ${e}`))
    app.quit()
  }, 10000)

  console.log(`\n正在加载: ${htmlPath}`)
  win.loadFile(htmlPath)
})
