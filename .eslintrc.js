module.exports = {
  root: true,
  extends: [
    '@react-native/eslint-config',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': ['error'],
        'no-shadow': 'off',
        'no-undef': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'react-native/no-inline-styles': 'warn',
        'react-hooks/exhaustive-deps': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
      },
    },
  ],
  settings: {
    'import/resolver': {
      'babel-module': {
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@utils': './src/utils',
          '@models': './src/models',
          '@constants': './src/constants',
          '@store': './src/store',
          '@api': './src/api',
          '@config': './src/config',
        },
      },
    },
  },
};