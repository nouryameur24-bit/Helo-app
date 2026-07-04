/**
 * hooks/useAppTheme.ts — ré-export du socle thème PARTAGÉ (ThemeProvider).
 *
 * L'ancienne implémentation (état par-hook, non partagé) est remplacée par un
 * Context root — cf. hooks/ThemeProvider.tsx. Ce fichier reste pour la
 * compatibilité des imports existants.
 */
export { useAppTheme, useColors, ThemeProvider, type ThemeMode } from '@/hooks/ThemeProvider';
