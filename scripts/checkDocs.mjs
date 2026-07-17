#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const rootDocuments = [
  'AGENTS.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'PRIVACY.md',
  'PROJECT_BASIS.md',
  'README.md',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
]

function walkFiles(directoryPath) {
  if (!existsSync(directoryPath)) {
    return []
  }

  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directoryPath, entry.name)
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath]
  })
}

function getActiveDocuments() {
  return [
    ...rootDocuments.map((filePath) => resolve(rootDir, filePath)),
    ...walkFiles(resolve(rootDir, 'docs')).filter((filePath) => extname(filePath).toLowerCase() === '.md'),
  ]
}

function normalizeMarkdownTarget(rawTarget) {
  const trimmed = rawTarget.trim().replace(/^<|>$/g, '')
  const titleSeparator = trimmed.match(/\s+["'][^"']*["']$/)
  return titleSeparator ? trimmed.slice(0, titleSeparator.index) : trimmed
}

function checkDocuments() {
  const failures = []
  const forbiddenPatterns = [
    { label: 'Yarn reference', pattern: /\bYarn\b/i },
    { label: 'Obsidian double link', pattern: /\[\[[^\]]+\]\]/ },
    { label: 'unfinished placeholder', pattern: /\bTBD\b|待提交/ },
    { label: 'fixed old version example', pattern: /\bv0\.[0-4]\.\d+\b/ },
  ]

  for (const filePath of getActiveDocuments()) {
    if (!existsSync(filePath)) {
      failures.push(`${relative(rootDir, filePath)}: required document is missing`)
      continue
    }

    const content = readFileSync(filePath, 'utf8')
    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(content)) {
        failures.push(`${relative(rootDir, filePath)}: matched ${label}`)
      }
    }

    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = normalizeMarkdownTarget(match[1]).split('#')[0]
      if (!target || /^(?:https?:|mailto:)/i.test(target)) {
        continue
      }

      const resolvedTarget = resolve(dirname(filePath), decodeURIComponent(target))
      if (!existsSync(resolvedTarget)) {
        failures.push(`${relative(rootDir, filePath)}: broken relative link ${match[1]}`)
      }
    }
  }

  return failures
}

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function listRelativeFiles(directoryPath) {
  return walkFiles(directoryPath)
    .filter((filePath) => statSync(filePath).isFile())
    .map((filePath) => relative(directoryPath, filePath).replace(/\\/g, '/'))
    .sort()
}

function checkSkillMirror() {
  const sourceDir = resolve(rootDir, '.agents/skills')
  const mirrorDir = resolve(rootDir, '.claude/skills')
  const sourceFiles = listRelativeFiles(sourceDir)
  const mirrorFiles = listRelativeFiles(mirrorDir)
  const failures = []

  if (sourceFiles.join('\n') !== mirrorFiles.join('\n')) {
    failures.push('.agents/skills and .claude/skills contain different file sets')
    return failures
  }

  for (const filePath of sourceFiles) {
    if (hashFile(resolve(sourceDir, filePath)) !== hashFile(resolve(mirrorDir, filePath))) {
      failures.push(`skill mirror differs: ${filePath}`)
    }
  }

  return failures
}

const failures = [...checkDocuments(), ...checkSkillMirror()]
if (failures.length > 0) {
  console.error('Documentation check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
} else {
  console.log('Documentation links, active-content rules and skill mirror consistency passed.')
}
