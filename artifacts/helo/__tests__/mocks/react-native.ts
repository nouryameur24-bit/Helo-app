// Minimal React Native mock for unit tests
export const Platform = {
  OS: 'ios' as const,
  select: (obj: Record<string, unknown>) => obj.ios,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
};

export const Dimensions = {
  get: () => ({ width: 375, height: 812 }),
};
