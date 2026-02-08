import config from '@book000/eslint-config'

export default [
  {
    ignores: ['userdata/**', 'dist/**'],
  },
  ...config,
  {
    // page.evaluate() 内での TypeScript/ESLint ルール調整
    // Puppeteer の evaluate() 内では NodeList を Array に変換する必要があるが、
    // spread operator は TypeScript エラーになるため Array.from() を使用
    files: ['src/**/*.ts'],
    rules: {
      'unicorn/prefer-spread': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
    },
  },
]
