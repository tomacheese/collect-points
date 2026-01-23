import fs from 'node:fs'
import path from 'node:path'

/**
 * package.json からバージョンを取得する
 *
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
