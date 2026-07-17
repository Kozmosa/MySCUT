import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { releaseNotesDir, rootDir } from './constants.mjs'

export function resolveReleaseNote({ note, noteFile }) {
  if (noteFile) {
    const sourcePath = resolve(rootDir, noteFile)
    if (!existsSync(sourcePath)) {
      throw new Error(`Release note file not found: ${sourcePath}`)
    }

    const fileContent = readFileSync(sourcePath, 'utf8').trim()
    if (!fileContent) {
      throw new Error(`Release note file is empty: ${sourcePath}`)
    }

    return fileContent
  }

  return note.trim()
}

export function writeReleaseNoteFile({ tag, content }) {
  if (!content) {
    return ''
  }

  if (!existsSync(releaseNotesDir)) {
    mkdirSync(releaseNotesDir, { recursive: true })
  }

  const noteFilePath = resolve(releaseNotesDir, `${tag}.md`)
  writeFileSync(noteFilePath, `${content.trim()}\n`)
  return noteFilePath
}
