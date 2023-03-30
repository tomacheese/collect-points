import { execSync } from 'node:child_process'
import fs from 'node:fs'

export function getGitHash(): string | undefined {
  try {
    // git rev-parse --short HEADを実行し、エラーを含めて結果を出力しない
    const process = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return process.trim()
  } catch {
    if (fs.existsSync('/app/VERSION')) {
      return fs.readFileSync('/app/VERSION').toString().trim()
    }
    return undefined
  }
}
