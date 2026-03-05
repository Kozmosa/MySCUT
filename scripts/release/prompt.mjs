import readline from 'node:readline'
import { Writable } from 'node:stream'

export function askYesNo(prompt) {
  return new Promise((resolveAnswer) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(prompt, (answer) => {
      rl.close()
      const normalized = answer.trim().toLowerCase()
      resolveAnswer(normalized === 'y' || normalized === 'yes')
    })
  })
}

export function askText(prompt) {
  return new Promise((resolveAnswer) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(prompt, (answer) => {
      rl.close()
      resolveAnswer(answer.trim())
    })
  })
}

class MutableStdout extends Writable {
  constructor() {
    super()
    this.muted = false
  }

  _write(chunk, encoding, callback) {
    if (!this.muted) {
      process.stdout.write(chunk, encoding)
    }

    callback()
  }
}

export function askHidden(prompt) {
  return new Promise((resolveAnswer) => {
    const mutableStdout = new MutableStdout()
    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    })

    mutableStdout.muted = false
    rl.question(prompt, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolveAnswer(answer.trim())
    })
    mutableStdout.muted = true
  })
}
