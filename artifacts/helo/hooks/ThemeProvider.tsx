/**
 * ThemeProvider — état de thème PARTAGÉ (light/dark/auto) au niveau root.
 *
 * ⚠️ Corrige le défaut bloquant de l'ancien `useAppTheme` : chaque appel créait
 * son PROPRE `useState` + lisait AsyncStorage indépendamment → toggler quelque
 * part ne notifiait AUCUN autre écran. Le dark mode ne pouvait donc jamais
 * fonctionner app-wide. Ici l'état est unique (Context), tous les
 * `useColors()`/`useAppTheme()` le partagent et re-render ensemble au toggle.
 *
 * Migration d'un écran (pattern) :
 *   // AVANT (statique — ne réagit pas)
 *   import { Colors } from '@/constants/theme';
 *   const styles = StyleSheet.create({ box: { backgroundColor: Colors.surface } });
 *   // APRÈS (réactif)
 *   import { useColors } from '@/hooks/ThemeProvider';
 *   const c = useColors();
 *   const styles = useMemo(() => StyleSheet.create({ box: { backgroundColor: c.surface } }), [c]);
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

import { Colors, ColorsDark, type ColorPalette } from '@/constants/theme';

const STORAGE_KEY = '@helo_theme_mode';

export type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextValue {
  /** Mode choisi par l'utilisatrice : auto / light / dark. */
  mode: ThemeMode;
  /** Mode effectif résolu (jamais 'auto'). */
  resolved: 'light' | 'dark';
  /** Palette active — source de vérité des composants migrés. */
  colors: ColorPalette;
  /** Setter persistant. */
  setMode: (mode: ThemeMode) => Promise<void>;
}

function resolveScheme(mode: ThemeMode, system: ColorSchemeName): 'light' | 'dark' {
  if (mode === 'auto') return system === 'dark' ? 'dark' : 'light';
  return mode;
}

// Défaut : light (avant hydratation AsyncStorage). Jamais null → pas de garde
// nécessaire côté consommateurs.
const ThemeContext = createContext<ThemeContextValue>({
  mode: 'auto',
  resolved: 'light',
  colors: Colors,
  setMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
          setModeState(stored);
        }
      } catch {
        // Ignore : 'auto' par défaut.
      }
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best effort — l'état local est déjà à jour.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const resolved = resolveScheme(mode, systemScheme);
    return {
      mode,
      resolved,
      colors: (resolved === 'dark' ? ColorsDark : Colors) as ColorPalette,
      setMode,
    };
  }, [mode, systemScheme, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Accès complet (mode + setter) — pour le sélecteur de thème. */
export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Raccourci : la palette active seule. */
export function useColors(): ColorPalette {
  return useContext(ThemeContext).colors;
}
