// Jest global setup for Hēlo unit tests

// Polyfill __DEV__ (normally injected by Metro bundler)
(globalThis as Record<string, unknown>).__DEV__ = true;

// Silence console.warn during tests (can be enabled per-test if needed)
globalThis.console.warn = jest.fn();
