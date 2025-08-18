module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/testUtils.tsx',
    '<rootDir>/__tests__/setup/accessibility.setup.js',
  ],

  // Coverage configuration for ST-06-7
  collectCoverage: true,
  collectCoverageFrom: [
    // New modules requiring ≥85% coverage
    'src/validation/**/*.{ts,tsx}',
    'src/components/leads/StatusChangeDialog.{ts,tsx}',
    'src/services/SyncSchedulingService.{ts,tsx}',
    'src/utils/toastHelpers.{ts,tsx}',

    // Global coverage ≥80%
    'src/**/*.{ts,tsx}',

    // Exclusions
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/index.{ts,tsx}',
    '!src/types/**',
  ],

  coverageReporters: ['text', 'text-summary', 'html', 'json', 'lcov'],

  coverageDirectory: 'coverage',

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Higher thresholds for new modules
    'src/validation/**/*.{ts,tsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/components/leads/StatusChangeDialog.{ts,tsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],

  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-paper|react-native-vector-icons)/)',
  ],

  testEnvironment: 'jsdom',

  // Performance
  maxWorkers: '50%',

  // Mock modules
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
