import { createHash } from 'node:crypto'

export function resolveManualBuildProtocol({
  hasPackageLock,
  hasVitePressConfig,
}) {
  if (!hasPackageLock) {
    throw new Error('Manual package-lock.json is missing')
  }

  if (!hasVitePressConfig) {
    throw new Error('Manual VitePress config is missing')
  }

  return {
    installCommand: 'npm ci',
    lockFileName: 'package-lock.json',
    outputDirectoryName: 'vite-platform-dist',
  }
}

export function createManualDependencyStamp(installCommand, lockFileContent) {
  return createHash('sha256')
    .update(installCommand)
    .update('\0')
    .update(lockFileContent)
    .digest('hex')
}
