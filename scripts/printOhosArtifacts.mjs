import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { rootDir } from './manualSubmoduleUtils.mjs'

const ohosBuildDir = resolve(rootDir, 'ohos/entry/build')
const artifactExts = new Set(['.hap', '.app'])

function collectArtifacts(dirPath, acc = []) {
  if (!existsSync(dirPath)) {
    return acc
  }

  const entries = readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name)
    if (entry.isDirectory()) {
      collectArtifacts(fullPath, acc)
      continue
    }

    const lowerName = entry.name.toLowerCase()
    for (const ext of artifactExts) {
      if (lowerName.endsWith(ext)) {
        acc.push(fullPath)
        break
      }
    }
  }

  return acc
}

const artifacts = collectArtifacts(ohosBuildDir)

if (artifacts.length === 0) {
  console.log('No OHOS .hap/.app artifacts found under ohos/entry/build')
  process.exit(1)
}

console.log('OHOS artifacts:')
for (const artifactPath of artifacts) {
  console.log(`- ${artifactPath}`)
}
