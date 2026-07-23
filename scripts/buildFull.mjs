import { cpSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { rootDir, run } from './manualSubmoduleUtils.mjs'

const nativeDir = resolve(rootDir, 'dist/native')

const tasks = [
  {
    name: 'native (shared for android/ios)',
    builder: () => {
      run('node scripts/buildApp.mjs', rootDir, {
        VITE_OUT_DIR: 'dist/native',
        VITE_TARGET_PLATFORM: 'android',
      })
    },
  },
  {
    name: 'android',
    builder: () => {
      const androidDir = resolve(rootDir, 'dist/android')
      rmSync(androidDir, { recursive: true, force: true })
      cpSync(nativeDir, androidDir, { recursive: true })
      run('node scripts/syncNativeVersion.mjs', rootDir)
      run('npx cap sync android', rootDir, { CAP_WEB_DIR: 'dist/android' })
    },
  },
  {
    name: 'ios',
    builder: () => {
      const iosDir = resolve(rootDir, 'dist/ios')
      rmSync(iosDir, { recursive: true, force: true })
      cpSync(nativeDir, iosDir, { recursive: true })
      run('node scripts/syncNativeVersion.mjs', rootDir)
      run('npx cap sync ios', rootDir, { CAP_WEB_DIR: 'dist/ios' })
    },
  },
  {
    name: 'web',
    builder: () => {
      run('node scripts/buildApp.mjs', rootDir, {
        VITE_OUT_DIR: 'dist/web',
        VITE_TARGET_PLATFORM: 'web',
      })
    },
  },
  {
    name: 'ohos',
    builder: () => {
      run('npm run build:ohos-web', rootDir)
    },
  },
]

const results = []

for (const task of tasks) {
  console.log(`\n=== Building ${task.name} ===`)
  try {
    task.builder()
    results.push({
      name: task.name,
      status: 'ok',
      detail: '',
    })
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Unknown build failure'
    results.push({
      name: task.name,
      status: 'failed',
      detail: message,
    })
    console.warn(`Build failed for ${task.name}: ${message}`)
  }
}

console.log('\n=== Build Summary ===')
for (const result of results) {
  if (result.status === 'ok') {
    console.log(`- ${result.name}: ok`)
  } else {
    console.log(`- ${result.name}: failed (${result.detail})`)
  }
}

const strictModeEnabled = process.env.BUILD_FULL_STRICT === '1' || process.env.BUILD_FULL_STRICT === 'true'
const requiredTaskNames = (process.env.BUILD_FULL_REQUIRED || '')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter((item) => item.length > 0)

if (strictModeEnabled) {
  const requiredSet = new Set(requiredTaskNames.length > 0 ? requiredTaskNames : tasks.map((task) => task.name))
  const failedRequiredTasks = results.filter(
    (result) => result.status !== 'ok' && requiredSet.has(result.name.toLowerCase()),
  )

  if (failedRequiredTasks.length > 0) {
    const failedNames = failedRequiredTasks.map((result) => result.name).join(', ')
    throw new Error(`build:full strict mode failed for required targets: ${failedNames}`)
  }
}
