import { device, cleanup } from 'detox';

beforeAll(async () => {
  console.log('Setting up Detox environment...');
});

afterAll(async () => {
  console.log('Cleaning up Detox environment...');
  await cleanup();
});
