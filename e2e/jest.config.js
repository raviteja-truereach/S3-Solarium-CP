module.exports = {
  maxWorkers: 1,
  testTimeout: 120000,
  testRegex: '\\.e2e\\.ts$',
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./init.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
