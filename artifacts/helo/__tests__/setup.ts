// Jest global setup for Hēlo unit tests

// Polyfill __DEV__ (normally injected by Metro bundler)
(global as Record<string, unknown>).__DEV__ = true;

// Silence console.warn during tests (can be enabled per-test if needed)
global.console.warn = jest.fn();
