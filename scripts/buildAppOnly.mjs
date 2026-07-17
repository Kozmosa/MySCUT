#!/usr/bin/env node

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runFile } from './release/shared.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDirectory = process.env.VITE_OUT_DIR || 'dist/app'
const targetPlatform = process.env.VITE_TARGET_PLATFORM || 'web'

runFile('npm', ['run', 'build:todo-snapshot'], rootDir)
runFile('npm', ['run', 'build:licenses'], rootDir)
runFile('npx', ['tsc', '-b'], rootDir)
runFile('npx', ['vite', 'build'], rootDir, {
  VITE_OUT_DIR: outputDirectory,
  VITE_TARGET_PLATFORM: targetPlatform,
})
