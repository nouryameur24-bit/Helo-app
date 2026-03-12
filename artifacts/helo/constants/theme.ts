export const Colors = {
  background: '#FFFAF5',
  backgroundSecondary: '#FFF5EE',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFCF9',

  textPrimary: '#2D2926',
  textSecondary: '#8C7E75',
  textTertiary: '#B8ADA6',

  accent: '#C9A96E',
  accentLight: '#E8D5B0',
  accentDark: '#A88B4A',

  safe: '#7CB69F',
  safeLight: '#E8F5EE',
  safeBg: '#F2FAF5',

  caution: '#D4A853',
  cautionLight: '#FFF3D6',
  cautionBg: '#FFFBF0',

  danger: '#C27B7B',
  dangerLight: '#FCEAEA',
  dangerBg: '#FFF5F5',

  border: '#EDE7E1',
  borderLight: '#F5F0EB',

  shadow: 'rgba(45, 41, 38, 0.06)',
  overlay: 'rgba(45, 41, 38, 0.4)',
} as const;

export const Typography = {
  displayLarge: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headlineLarge: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 26,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  labelLarge: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
  giant: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  soft: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  elevated: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
