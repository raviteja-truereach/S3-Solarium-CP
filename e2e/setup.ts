/**
 * E2E Test Setup
 * Global setup for Detox E2E tests
 */
import { device, cleanup } from 'detox';

beforeAll(async () => {
  console.log('🚀 Starting E2E test suite...');
});

afterAll(async () => {
  console.log('✅ E2E test suite completed');
  await cleanup();
});

// Global test timeout
jest.setTimeout(120000);

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
