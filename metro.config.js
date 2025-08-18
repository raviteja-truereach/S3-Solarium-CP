/**
 * Metro configuration for React Native 0.71.19
 * Enhanced with production optimizations and console log removal support
 *
 * @type {import('metro-config').MetroConfig}
 */
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    // Production optimizations
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      // Production-specific minification
      mangle: {
        keep_fnames: true, // Keep function names for better crash reports
      },
      compress: {
        drop_console: false, // Let Babel handle console removal for more control
      },
    },
  },
  resolver: {
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
  serializer: {
    // Optimize bundle creation
    optimizationSizeLimit: 150 * 1024, // 150KB threshold for optimization
  },
};
