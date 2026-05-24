/**
 * Lot 15B1 — Safe-back hook centralisé.
 *
 * Pourquoi : avant ce hook, l'app utilisait `router.back()` partout sans
 * vérification. Conséquences observées dans l'audit nav :
 *   • depuis un modal nested (basket-results au-dessus de basket-scan),
 *     un back unwind BOTH modals — l'utilisatrice atterrit à l'accueil
 *     au lieu de revenir au scan en cours.
 *   • depuis une notif push (cold start), il n'y a pas d'historique de
 *     navigation → router.back() devient un no-op silencieux. L'utilisatrice
 *     tape "Retour" et rien ne se passe.
 *   • dans le partner-share modal accédé via deep-link, back retombe sur
 *     ce qui était à l'arrière-plan (potentiellement l'écran de scan caméra
 *     d'une autre session).
 *
 * Ce hook :
 *   • check `navigation.canGoBack()` AVANT de tenter le back
 *   • si non, route explicitement vers `fallback` (ou `/(tabs)` par défaut)
 *   • avec router.replace pour ne pas polluer la stack
 *
 * Usage :
 * ```tsx
 * const safeBack = useSafeBack();           // default fallback = /(tabs)
 * const safeBack = useSafeBack('/(tabs)/scan'); // custom fallback
 * <Pressable onPress={safeBack}><Feather name="x" /></Pressable>
 * ```
 */

import { useCallback } from 'react';
import { router, useNavigation } from 'expo-router';

type FallbackRoute = Parameters<typeof router.replace>[0];

const DEFAULT_FALLBACK: FallbackRoute = '/(tabs)';

export function useSafeBack(fallback?: FallbackRoute): () => void {
  const navigation = useNavigation();

  return useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    // Pas d'historique — on route explicitement vers le fallback.
    // router.replace() pour ne pas ajouter d'entry historique inutile.
    router.replace(fallback ?? DEFAULT_FALLBACK);
  }, [navigation, fallback]);
}
