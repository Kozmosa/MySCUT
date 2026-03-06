import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import packageJson from './package.json'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const shouldBundlePdfLocalCMap = env.PDFJS_LOCAL_CMAP === '1' || env.PDFJS_LOCAL_CMAP === 'true'
  const outDir = env.VITE_OUT_DIR || 'dist/web'

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

  return {
    plugins,
    build: {
      outDir,
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __PDF_LOCAL_CMAP_ENABLED__: JSON.stringify(shouldBundlePdfLocalCMap),
    },
  }
})
