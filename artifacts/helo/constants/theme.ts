/**
 * Returns the given hex color with the supplied alpha (0..1).
 *
 *   withAlpha(Colors.accentLight, 0.33)  // → '#E8D5B054'
 *
 * Use this instead of `Colors.x + '55'` string concatenation to keep
 * opacity values explicit and theme-driven.
 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const byte = Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase();
  // Strip any existing alpha suffix (#RRGGBBAA → #RRGGBB).
  const base = hex.length === 9 ? hex.slice(0, 7) : hex;
  return `${base}${byte}`;
}

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

/**
 * Palette « Lune de minuit » — dark mode warm pour les consultations
 * nocturnes (T3 = insomnies massives). Choix volontaire : pas de pur
 * noir #000 (trop dur OLED + cassé du palette warm). Le noir charbon
 * #1A1815 garde la chaleur, le crème inversé #F5EFE6 garde la
 * lisibilité sans agresser.
 *
 * Activation : consommer via `useColors()` au lieu d'importer `Colors`
 * directement. La migration des écrans existants est progressive — pour
 * l'instant, le toggle existe mais aucun écran ne réagit visuellement.
 * Voir docs/DARK-MODE-MIGRATION.md (à créer) pour le plan d'extension.
 */
export const ColorsDark = {
  background: '#1A1815',
  backgroundSecondary: '#22201C',
  surface: '#27241F',
  surfaceElevated: '#2D2A24',

  textPrimary: '#F5EFE6',
  textSecondary: '#C4B8A8',
  textTertiary: '#807466',

  accent: '#D4B988',
  accentLight: '#8C7547',
  accentDark: '#E8D5B0',

  safe: '#8FCBB1',
  safeLight: '#3A4A42',
  safeBg: '#222B26',

  caution: '#E8C268',
  cautionLight: '#5A4A28',
  cautionBg: '#2E2820',

  danger: '#DB9090',
  dangerLight: '#5A3838',
  dangerBg: '#2E2222',

  border: '#3A352E',
  borderLight: '#2D2A24',

  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorPalette = typeof Colors;

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
