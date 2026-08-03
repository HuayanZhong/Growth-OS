import { defineNuxtModule } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { build, startup } from 'vite-plugin-electron'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// vite-plugin-electron 会在 process.electronApp 上挂载 Electron App 实例
declare global {
  namespace NodeJS {
    interface Process {
      electronApp?: import('electron').App
    }
  }
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const coreSrc = resolve(__dirname, '../../../packages/desktop-core/src')
const outDir = resolve(__dirname, '../../../packages/desktop-core/dist')

export default defineNuxtModule({
  meta: {
    name: 'desktop-electron',
    configKey: 'electron',
  },

  setup(_options: Record<string, never>, nuxt: Nuxt) {
    let started = false

    /**
     * 开发模式下：Nuxt dev server 启动后，build Electron 入口文件并启动 Electron 窗口。
     * 此 hook 仅在 `nuxt dev` 时触发。
     */
    nuxt.hook('listen', async (_server: unknown, listener: { url: string }) => {
      if (started) return
      started = true

      const url = listener.url ?? `http://localhost:${(_server as any)?.address()?.port ?? 3000}`
      process.env.VITE_DEV_SERVER_URL = String(url).replace(/\/$/, '')

      try {
        for (const entry of [resolve(coreSrc, 'main.ts'), resolve(coreSrc, 'preload.ts')]) {
          const isPreload = entry.endsWith('preload.ts')
          // watch: {} 启用 Vite 的观察模式，使得 main/preload 修改后自动增量编译
          await build({
            entry,
            vite: {
              mode: 'development',
              build: {
                outDir,
                watch: {},
                minify: false,
                // preload 必须输出 CJS：Electron sandbox 的 preload 不支持 ESM。
                // 扩展名用 .cjs 避开 package.json "type": "module" 的 ESM 解析
                ...(isPreload
                  ? { lib: { entry, formats: ['cjs'], fileName: () => 'preload.cjs' } }
                  : {}),
              },
            },
          })
        }

        // 启动 Electron 进程，argv 数组第一项为入口文件路径，其余为 Electron CLI 参数
        await startup([resolve(outDir, 'main.js'), '--no-sandbox'])

        // vite-plugin-electron 会在 process.electronApp 上注册 exit 监听。
        // 移除默认监听，让 Nuxt 进程的生命周期由自身控制，避免 Electron 退出时连带杀掉 Nuxt。
        process.electronApp?.removeAllListeners('exit')
      } catch (e) {
        console.error('[desktop-electron] 构建或启动 Electron 失败:', e)
      }
    })

    /**
     * 生产模式下：Nuxt 构建完成后编译 Electron 入口文件。
     *
     * 注意：此 hook 仅构建入口文件（产出 JS），不启动 Electron。
     * 生产环境需要配合 electron-builder 做完整打包（将 .output/public 作为窗口加载目录）。
     */
    nuxt.hook('build:done', async () => {
      if (!nuxt.options.dev) {
        try {
          for (const entry of [resolve(coreSrc, 'main.ts'), resolve(coreSrc, 'preload.ts')]) {
            const isPreload = entry.endsWith('preload.ts')
            await build({
              entry,
              vite: {
                mode: 'production',
                build: {
                  outDir,
                  minify: true,
                  // preload 必须输出 CJS：Electron sandbox 的 preload 不支持 ESM。
                  // 扩展名用 .cjs 避开 package.json "type": "module" 的 ESM 解析
                  ...(isPreload
                    ? { lib: { entry, formats: ['cjs'], fileName: () => 'preload.cjs' } }
                    : {}),
                },
              },
            })
          }
        } catch (e) {
          console.error('[desktop-electron] 生产构建 Electron 入口失败:', e)
        }
      }
    })
  },
})
