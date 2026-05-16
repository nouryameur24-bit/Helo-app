/** @type {import('jest').Config} */
const config = {
  // Use ts-jest for pure TypeScript unit tests (no React Native runtime needed)
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // Relax strict settings for test files
        strict: true,
        esModuleInterop: true,
        moduleResolution: 'node',
        baseUrl: '.',
        paths: { '@/*': ['./*'] },
      },
    }],
  },
  moduleNameMapper: {
    // More specific aliases must come BEFORE the catch-all `^@/(.*)$`.
    '^@/lib/sentry$': '<rootDir>/__tests__/mocks/sentry.ts',
    '^@/(.*)$': '<rootDir>/$1',
    // Mock native modules that can't run in Node
    '^react-native$': '<rootDir>/__tests__/mocks/react-native.ts',
    '^expo-linear-gradient$': '<rootDir>/__tests__/mocks/empty-module.ts',
    '^expo-haptics$': '<rootDir>/__tests__/mocks/empty-module.ts',
    '^expo-image$': '<rootDir>/__tests__/mocks/empty-module.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/mocks/async-storage.ts',
  },
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
};

module.exports = config;
