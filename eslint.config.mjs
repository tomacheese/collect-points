import config from '@book000/eslint-config'

export default [
  {
    ignores: ['userdata/**', 'dist/**'],
  },
  ...config,
  {
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "MemberExpression[object.name='page'][property.name='goto']",
          message:
            'page.goto() の直接使用は禁止されています。safeGoto() を使用してください。',
        },
      ],
    },
  },
]
