/**
 * hooks/useAppTheme.ts — Mode thème global (light / dark / auto).
 *
 * v4 design polish. Stratégie volontairement progressive :
 *
 *   - Toggle ici présent et fonctionnel (persistance AsyncStorage)
 *   - `useColors()` retourne la bonne palette selon le mode
 *   - **MAIS** les composants existants importent encore `Colors` directement
 *     depuis `constants/theme` → ils ne réagissent pas tant qu'on ne migre
 *     pas écran par écran (cf. docs/DARK-MODE-MIGRATION.md).
 *
 * Pourquoi cette dette progressive : migrer 30+ écrans d'un coup = risque
 * de casser le UI. On déploie l'infra, on migre écran par écran (Home →
 * Verdict → Chat → ...) en validant visuellement à chaque PR.
 *
 * Pour l'instant, l'utilisatrice peut toggle dans Settings, on stocke sa
 * préférence — mais l'effet visuel arrivera progressivement avec les
 * prochaines releases. Quand un écran est migré : il consomme `useColors()`
 * et bascule automatiquement.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

import { Colors, ColorsDark, type ColorPalette } from '@/constants/theme';

const STORAGE_KEY = '@helo_theme_mode';

export type ThemeMode = 'auto' | 'light' | 'dark';

interface UseAppTheme {
  /** Mode défini par l'utilisateur : auto / light / dark. */
  mode: ThemeMode;
  /** Mode effectif résolu (jamais 'auto' — toujours light ou dark). */
  resolved: 'light' | 'dark';
  /** Palette à utiliser. Source of truth pour les composants migrés. */
  colors: ColorPalette;
  /** Setter persistant. */
  setMode: (mode: ThemeMode) => Promise<void>;
}

function resolveScheme(mode: ThemeMode, system: ColorSchemeName): 'light' | 'dark' {
  if (mode === 'auto') return system === 'dark' ? 'dark' : 'light';
  return mode;
}

export function useAppTheme(): UseAppTheme {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Lecture persistance au mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
          setModeState(stored);
        }
      } catch {
        // Ignore : on garde 'auto' par défaut.
      }
    })();
  }, []);

  // Réagit aux changements système (utilisatrice change le thème iOS/Android)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
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

  const resolved = resolveScheme(mode, systemScheme);
  const colors = (resolved === 'dark' ? ColorsDark : Colors) as ColorPalette;

  return { mode, resolved, colors, setMode };
}

/**
 * Raccourci : utilise `useColors()` quand tu n'as besoin que de la
 * palette (pas du toggle). Migration pattern pour les écrans :
 *
 *   // AVANT
 *   import { Colors } from '@/constants/theme';
 *   const styles = StyleSheet.create({ box: { backgroundColor: Colors.surface } });
 *
 *   // APRÈS
 *   import { useColors } from '@/hooks/useAppTheme';
 *   const Colors = useColors();
 *   const styles = useMemo(() => StyleSheet.create({ box: { backgroundColor: Colors.surface } }), [Colors]);
 */
export function useColors(): ColorPalette {
  return useAppTheme().colors;
}
