import { describe, expect, it } from 'vitest'
import {
  createManualVitePressBuildArguments,
  MANUAL_VITEPRESS_BASE,
} from '../../scripts/manualVitePressBuild.mjs'

describe('createManualVitePressBuildArguments', () => {
  it('builds the isolated manual source with the app docs base', () => {
    expect(createManualVitePressBuildArguments({
      vitePressCliPath: 'manual/node_modules/vitepress/bin/vitepress.js',
      tempDocsDir: 'manual/.platform-build-tmp/docs',
      outputDir: 'manual/vite-platform-dist',
    })).toEqual([
      'manual/node_modules/vitepress/bin/vitepress.js',
      'build',
      'manual/.platform-build-tmp/docs',
      '--base',
      MANUAL_VITEPRESS_BASE,
      '--outDir',
      'manual/vite-platform-dist',
    ])
  })
})
