export const Sentry = {
  init: () => {},
  wrap: <T>(c: T): T => c,
  captureException: () => {},
  captureMessage: () => {},
};
export function initSentry(): void {}
