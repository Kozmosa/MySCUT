import { rootDir, run } from './manualSubmoduleUtils.mjs'

const tasks = [
  { name: 'web', command: 'npm run build:web' },
  { name: 'android', command: 'npm run build:android' },
  { name: 'ios', command: 'npm run build:ios' },
  { name: 'ohos', command: 'npm run build:ohos-web' },
]

const results = []

for (const task of tasks) {
  console.log(`\n=== Building ${task.name} ===`)
  try {
    run(task.command, rootDir)
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
