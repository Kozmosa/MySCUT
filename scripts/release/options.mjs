import { VERSION_PATTERN } from './constants.mjs'

function parseNpmOriginalArgs() {
  const npmConfigArgv = process.env.npm_config_argv
  if (!npmConfigArgv) {
    return []
  }

  try {
    const parsed = JSON.parse(npmConfigArgv)
    const original = Array.isArray(parsed.original) ? parsed.original : []
    return original
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  } catch {
    return []
  }
}

function parsePlatformList(input) {
  return input
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

export function parseReleaseOptions() {
  const directArgs = process.argv.slice(2).map((item) => item.trim()).filter((item) => item.length > 0)
  const rawArgs = directArgs.length > 0 ? directArgs : parseNpmOriginalArgs()

  let version = ''
  let note = ''
  let android = false
  let ios = false
  let hasPlatformFlag = false

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (!version && VERSION_PATTERN.test(arg)) {
      version = arg
      continue
    }

    if (arg === '--android') {
      hasPlatformFlag = true
      android = true
      continue
    }

    if (arg === '--ios') {
      hasPlatformFlag = true
      ios = true
      continue
    }

    if (arg === '--platform') {
      const next = rawArgs[index + 1]
      if (!next) {
        throw new Error('Missing value for --platform. Example: --platform android,ios')
      }

      hasPlatformFlag = true
      index += 1
      const platforms = parsePlatformList(next)
      for (const platform of platforms) {
        if (platform === 'android') {
          android = true
          continue
        }

        if (platform === 'ios') {
          ios = true
          continue
        }

        throw new Error(`Unsupported platform "${platform}". Use android or ios.`)
      }

      continue
    }

    if (arg.startsWith('--platform=')) {
      hasPlatformFlag = true
      const value = arg.slice('--platform='.length)
      const platforms = parsePlatformList(value)
      for (const platform of platforms) {
        if (platform === 'android') {
          android = true
          continue
        }

        if (platform === 'ios') {
          ios = true
          continue
        }

        throw new Error(`Unsupported platform "${platform}". Use android or ios.`)
      }

      continue
    }

    if (arg === '--note') {
      const next = rawArgs[index + 1]
      if (!next) {
        throw new Error('Missing value for --note. Example: --note "- New UI"')
      }

      note = next
      index += 1
      continue
    }

    if (arg.startsWith('--note=')) {
      note = arg.slice('--note='.length)
    }
  }

  if (!hasPlatformFlag) {
    android = true
  }

  if (!android && !ios) {
    throw new Error('No platform selected. Use --android and/or --ios.')
  }

  return {
    version,
    note,
    platforms: {
      android,
      ios,
    },
  }
}
