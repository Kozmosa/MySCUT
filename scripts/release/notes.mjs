import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { releaseNotesDir } from './constants.mjs'

export function writeReleaseNoteFile({ tag, note }) {
  if (!note) {
    return ''
  }

  if (!existsSync(releaseNotesDir)) {
    mkdirSync(releaseNotesDir, { recursive: true })
  }

  const noteFilePath = resolve(releaseNotesDir, `${tag}.md`)
  writeFileSync(noteFilePath, `${note.trim()}\n`)
  return noteFilePath
}
