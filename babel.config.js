module.exports = {
  presets: [
    [
      'module:metro-react-native-babel-preset',
      {
        runtime: 'automatic',
      },
    ],
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@utils': './src/utils',
          '@models': './src/models',
          '@constants': './src/constants',
          '@store': './src/store',
          '@config': './src/config',
          '@hooks': './src/hooks',
          '@navigation': './src/navigation',
          '@theme': './src/theme',
          '@contexts': './src/contexts',
        },
      },
    ],
    'react-native-reanimated/plugin', // Must be listed last
  ],
  env: {
    // Production environment configuration
    production: {
      plugins: [
        [
          'transform-remove-console',
          {
            // Keep console.error and console.warn for crash reporting
            // Remove console.log, console.info, console.debug, console.trace, console.table
            exclude: ['error', 'warn'],
          },
        ],
      ],
    },
  },
};
