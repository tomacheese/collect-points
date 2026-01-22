import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * package.json からバージョンを取得する
 * @returns バージョン文字列、取得できない場合は undefined
 */
export function getVersion(): string | undefined {
  try {
    // 実行ディレクトリの package.json を読み込む
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      return undefined
    }
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf8')
    ) as {
      version?: string
    }
    return packageJson.version
  } catch {
    return undefined
  }
}

/**
 * Git のコミットハッシュを取得する
 * @returns 短縮コミットハッシュ、取得できない場合は undefined
 */
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
