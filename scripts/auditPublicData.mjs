#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)
const shouldScanHistory = args.includes('--history')
const patternFileIndex = args.indexOf('--pattern-file')
const patternFilePath = patternFileIndex >= 0 ? args[patternFileIndex + 1] : process.env.PUBLIC_DATA_PATTERN_FILE

if (patternFileIndex >= 0 && !patternFilePath) {
  throw new Error('Missing value for --pattern-file')
}

const skippedPrefixes = [
  '.agents/',
  '.claude/',
  'LLM-Working/archive/',
  'external/',
  'android/',
  'ios/',
  'ohos/',
]
const skippedFiles = new Set(['docs/mermaid.min.js', 'package-lock.json'])
const skippedExtensions = new Set([
  '.apk',
  '.gif',
  '.ico',
  '.ipa',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.wasm',
  '.woff',
  '.woff2',
])
const highConfidencePatterns = [
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: 'OpenAI-style secret key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { label: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { label: 'absolute developer path', pattern: /(?:[A-Za-z]:\\Users\\[^\\\r\n]+|\/Users\/[^/\s]+|\/home\/[^/\s]+)/ },
]

function listTrackedFiles() {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: rootDir,
    encoding: 'utf8',
  }).split('\0').filter(Boolean)
}

function shouldScanFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/')
  return !skippedFiles.has(normalizedPath)
    && !skippedPrefixes.some((prefix) => normalizedPath.startsWith(prefix))
    && !skippedExtensions.has(extname(normalizedPath).toLowerCase())
}

function readLiteralPatterns() {
  if (!patternFilePath) {
    return []
  }

  const absolutePath = resolve(rootDir, patternFilePath)
  return readFileSync(absolutePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}

function auditSyntheticFixtures(failures) {
  const fixtureFiles = listTrackedFiles().filter((filePath) => filePath.startsWith('tests/fixtures/public/'))
  if (fixtureFiles.length === 0) {
    failures.push('tests/fixtures/public/: no tracked public fixture found')
    return
  }

  for (const filePath of fixtureFiles) {
    const content = readFileSync(resolve(rootDir, filePath), 'utf8')
    if (/\d{9,}/.test(content)) {
      failures.push(`${filePath}: contains an abnormally long numeric identifier`)
    }

    if (/[\u4e00-\u9fff]{2,8}(?:同学|老师)/.test(content)) {
      failures.push(`${filePath}: contains a person-like Chinese fixture identifier`)
    }

    const requiredMarkers = filePath.endsWith('.html')
      ? [
          'TEST-STUDENT-',
          'TEST-TEACHER-',
          'TEST-CLASS-',
          'TEST-SECTION-',
          'TEST-GROUP-',
          'TEST-ROOM-',
        ]
      : [
          'TEST-COURSE-',
          'TEST-TEACHER-',
          'TEST-ROOM-',
        ]
    for (const marker of requiredMarkers) {
      if (!content.includes(marker)) {
        failures.push(`${filePath}: missing required synthetic marker ${marker}`)
      }
    }
  }
}

function auditCurrentTree(literalPatterns) {
  const failures = []
  auditSyntheticFixtures(failures)

  for (const filePath of listTrackedFiles().filter(shouldScanFile)) {
    const absolutePath = resolve(rootDir, filePath)
    let content
    try {
      content = readFileSync(absolutePath, 'utf8')
    } catch {
      continue
    }

    for (const { label, pattern } of highConfidencePatterns) {
      if (pattern.test(content)) {
        failures.push(`${filePath}: matched ${label}`)
      }
    }

    if (/(?<![A-Za-z0-9])\d{9,}(?![A-Za-z0-9])/.test(content)) {
      failures.push(`${filePath}: contains an abnormally long numeric identifier`)
    }

    for (const literal of literalPatterns) {
      if (content.includes(literal)) {
        failures.push(`${filePath}: matched a private pattern from ${relative(rootDir, resolve(rootDir, patternFilePath))}`)
      }
    }
  }

  return failures
}

function auditHistory(literalPatterns) {
  if (!shouldScanHistory) {
    return []
  }

  if (literalPatterns.length === 0) {
    throw new Error('History audit requires a temporary --pattern-file')
  }

  const failures = []
  for (const literal of literalPatterns) {
    const matchingCommit = execFileSync(
      'git',
      ['log', '--all', '--format=%H', '-1', '-S', literal, '--'],
      { cwd: rootDir, encoding: 'utf8' },
    ).trim()

    if (matchingCommit) {
      failures.push(`history: private pattern remains reachable at ${matchingCommit}`)
    }
  }

  const reachableObjects = execFileSync('git', ['rev-list', '--objects', '--all'], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (/\.(?:apk|ipa)(?:\r?$)/im.test(reachableObjects)) {
    failures.push('history: reachable APK or IPA path remains')
  }

  return failures
}

const literalPatterns = readLiteralPatterns()
const failures = [
  ...auditCurrentTree(literalPatterns),
  ...auditHistory(literalPatterns),
]

if (failures.length > 0) {
  console.error('Public data audit failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
} else {
  console.log(`Public data audit passed (${shouldScanHistory ? 'current tree and history' : 'current tree'}).`)
}
