import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import packageJson from './package.json'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const shouldBundlePdfLocalCMap = env.PDFJS_LOCAL_CMAP === '1' || env.PDFJS_LOCAL_CMAP === 'true'
  const targetPlatform = env.VITE_TARGET_PLATFORM || 'web'
  const isPwaBuild = env.VITE_PWA === '1' || env.VITE_PWA === 'true'
  const outDir = env.VITE_OUT_DIR || 'dist/web'
  const base = targetPlatform === 'ohos' ? './' : '/'

  const plugins = [react()]

  if (shouldBundlePdfLocalCMap) {
    plugins.push(
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/pdfjs-dist/cmaps/*',
            dest: 'pdfjs/cmaps',
          },
          {
            src: 'node_modules/pdfjs-dist/standard_fonts/*',
            dest: 'pdfjs/standard_fonts',
          },
        ],
      }),
    )
  }

  if (isPwaBuild) {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        manifest: false,
        workbox: {
          globIgnores: ['**/docs/**'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/docs\//],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/[^/]+\/docs\/.*$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'myscut-docs-runtime',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
          ],
        },
      }),
    )
  }

  return {
    base,
    plugins,
    build: {
      outDir,
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __PDF_LOCAL_CMAP_ENABLED__: JSON.stringify(shouldBundlePdfLocalCMap),
      __PWA_ENABLED__: JSON.stringify(isPwaBuild),
    },
  }
})
